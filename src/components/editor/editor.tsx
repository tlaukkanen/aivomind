"use client";

import { useState, useCallback, useRef } from "react";
import { Edge, Node, MarkerType, useEdgesState, 
  useNodesState, useReactFlow, useNodeConnections } from "@xyflow/react";
import { toast } from "sonner";

import { PropertiesPanelHandle } from "./properties-panel";
import Canvas from "./canvas";
import PropertiesPanel from "./properties-panel";
import { Toolbar } from "./toolbar";
import { Menubar } from "./menubar";
import { TextProperties } from "./nodes/base-node";

import { useEditor } from "@/store/editor-context";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { DiagramElement, ResourceOption } from "@/model/types";
import { logger } from "@/services/logger";
import { sampleData } from "@/model/example-data";
import { ResourceNodeTypes } from "@/model/node-types";
import { findClosestNodeInDirection, getAbsolutePosition } from "@/utils/node-utils";

const initialNodes: DiagramElement[] = sampleData.nodes;
const initialEdges: Edge[] = sampleData.edges;
const rootNodeId = "root";

// Add this helper function before the Editor component
const cleanNodesForStorage = (nodes: DiagramElement[]) => {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      showHandles: undefined,
      resizing: undefined,
      selected: undefined,
    },
  }));
};

/** Helper to update data for a selected node */
function updateSelectedNodeData(
  nodes: DiagramElement[],
  selectedNodeId: string | null,
  updater: (data: any) => any,
) {
  if (!selectedNodeId) return nodes;

  return nodes.map((node) =>
    node.id === selectedNodeId ? { ...node, data: updater(node.data) } : node,
  );
}

// Abstracted local storage logic
function saveToLocalStorage(nodes: DiagramElement[], edges: Edge[]) {
  const cleanedNodes = cleanNodesForStorage(nodes);

  localStorage.setItem("nodes", JSON.stringify(cleanedNodes));
  localStorage.setItem("edges", JSON.stringify(edges));
}

function restoreFromLocalStorage() {
  const storedNodes = localStorage.getItem("nodes");
  const storedEdges = localStorage.getItem("edges");

  return {
    nodes: storedNodes ? JSON.parse(storedNodes) : [],
    edges: storedEdges ? JSON.parse(storedEdges) : [],
  };
}

// Add where nodes are created/initialized
export const getDefaultTextProperties = (
  resourceType: string,
): TextProperties | undefined => {
  const resource = ResourceNodeTypes.find((r) => r.name === resourceType);

  if (resource?.defaultTextProperties) {
    return resource.defaultTextProperties;
  }

  return undefined;
};

const findFreePosition = (
  nodes: DiagramElement[],
  basePosition: { x: number; y: number },
  spacing: number = 100,
  parentId: string | undefined,
  getIntersectingNodes: (node: Node) => Node[],
): { x: number; y: number } => {
  // If there's a parent, convert basePosition to absolute coordinates
  logger.debug(`Finding free position for layout for base position ${basePosition.x}, ${basePosition.y}`);

  if (parentId) {
    const parent = nodes.find(n => n.id === parentId);
    if (parent) {
      const parentAbsPos = getAbsolutePosition(parent, nodes);
      basePosition = {
        x: parentAbsPos.x + basePosition.x,
        y: parentAbsPos.y + basePosition.y,
      };
    }
    logger.debug(`Converted base position to absolute coordinates ${basePosition.x}, ${basePosition.y}`);
  }

  // Create a temporary node to check intersections with absolute position
  const tempNode: Node = {
    id: 'temp',
    type: 'rectangleShape',
    position: basePosition,
    data: {},
    width: 100,
    height: 40,
  };

  let offset = 0;
  const position = { ...basePosition };
  tempNode.position = position;
  
  // Keep trying new positions until we find one with no intersections
  let tries = 0;
  while (getIntersectingNodes(tempNode).length > 0) {
    if (tries % 2 === 0) {
      offset += spacing;
    }
    position.y = basePosition.y + (offset * (tries % 2 === 0 ? 1 : -1));
    logger.debug(`Trying new vertical position ${position.x}, ${position.y}`);   
    tempNode.position = position;
    tries++;
  }

  // Convert back to relative position if there's a parent
  if (parentId) {
    const parent = nodes.find(n => n.id === parentId);
    if (parent) {
      const parentAbsPos = getAbsolutePosition(parent, nodes);
      const convertedPosition = {
        x: position.x - parentAbsPos.x,
        y: position.y - parentAbsPos.y,
      };
      logger.debug(`Found free position ${convertedPosition.x}, ${convertedPosition.y}`);
      return convertedPosition;
    }
  }

  logger.debug(`Found free position ${position.x}, ${position.y}`);
  return position;
};

export default function Editor() {
  const { isFullScreen, setIsFullScreen } = useEditor();
  const { getIntersectingNodes, deleteElements } = useReactFlow();

  const [isPropertiesPanelVisible, setIsPropertiesPanelVisible] =
    useState(true);
  const [isResourcePanelVisible, setIsResourcePanelVisible] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const propertiesPanelRef = useRef<PropertiesPanelHandle>(null);
  const [copiedNodes, setCopiedNodes] = useState<DiagramElement[]>([]);
  const [pasteCount, setPasteCount] = useState(0);

  const rootLeftConnections = useNodeConnections({
    id: rootNodeId,
    handleType: 'source',
    handleId: 'root-left-source',
    
  });
  const rootRightConnections = useNodeConnections({
    id: rootNodeId,
    handleType: 'source',
    handleId: 'root-right-source',
  });

  // Derive selected node from selectedNodeId
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  const copyJsonToClipboard = () => {
    const cleanedNodes = cleanNodesForStorage(nodes);
    const project = {
      nodes: cleanedNodes,
      edges,
    };

    navigator.clipboard.writeText(JSON.stringify(project, null, 2));
    toast.success("Project copied to clipboard");
  };

  const onNewProject = () => {
    logger.info("Creating new project");

    setNodes([]);
    setEdges([]);
  };

  const saveDiagram = () => {
    logger.info("Saving diagram to local storage");
    saveToLocalStorage(nodes, edges);
  };

  const onRestoreDiagram = () => {
    logger.info("Restoring diagram from local storage");
    const { nodes: savedNodes, edges: savedEdges } = restoreFromLocalStorage();

    setNodes(savedNodes);
    setEdges(savedEdges);
  };

  const handleNodeNameChange = (newName: string) => {
    setNodes((prev) =>
      updateSelectedNodeData(prev, selectedNodeId, (data) => ({
        ...data,
        resourceName: newName,
      })),
    );
  };

  const handleNodeSkuChange = (newSku: string) => {
    setNodes((prev) =>
      updateSelectedNodeData(prev, selectedNodeId, (data) => ({
        ...data,
        sku: newSku,
      })),
    );
  };

  const handleEdgeLabelChange = (newLabel: string) => {
    if (!selectedEdgeId) return;

    setEdges(
      edges.map((edge) =>
        edge.id === selectedEdgeId ? { ...edge, label: newLabel } : edge,
      ),
    );
  };

  const handleEdgeAnimatedChange = (animated: boolean) => {
    if (!selectedEdgeId) return;

    setEdges(
      edges.map((edge) =>
        edge.id === selectedEdgeId ? { ...edge, animated } : edge,
      ),
    );
  };

  const handleNodeDescriptionChange = (newDescription: string) => {
    setNodes((prev) =>
      updateSelectedNodeData(prev, selectedNodeId, (data) => ({
        ...data,
        description: newDescription,
      })),
    );
  };

  const handleTextPropertiesChange = (props: Partial<TextProperties>) => {
    setNodes((prev) =>
      updateSelectedNodeData(prev, selectedNodeId, (data) => ({
        ...data,
        textProperties: {
          ...data.textProperties,
          ...props,
        },
      })),
    );
  };

  const handleResourceOptionChange = (
    optionName: string,
    value: string,
    show?: boolean,
  ) => {
    setNodes((prev) =>
      updateSelectedNodeData(prev, selectedNodeId, (data) => {
        const currentOptions = data.resourceOptions || [];
        const optionIndex = currentOptions.findIndex(
          (opt: ResourceOption) => opt.name === optionName,
        );

        const newOptions =
          optionIndex >= 0
            ? currentOptions.map((opt: ResourceOption, i: number) =>
                i === optionIndex
                  ? { ...opt, value, show: show ?? opt.show }
                  : opt,
              )
            : [
                ...currentOptions,
                { name: optionName, value, show: show ?? false },
              ];

        return {
          ...data,
          resourceOptions: newOptions,
        };
      }),
    );
  };

  const handleNodeSelection = useCallback((nodes: DiagramElement[]) => {
    const nodeIds = nodes.map((node) => node.id);

    // Only update if the selection has actually changed
    setSelectedNodeIds((prevIds) => {
      if (
        prevIds.length === nodeIds.length &&
        prevIds.every((id) => nodeIds.includes(id))
      ) {
        return prevIds;
      }

      return nodeIds;
    });

    // Update the single selected node for properties panel
    setSelectedNodeId(nodeIds.length > 0 ? nodeIds[nodeIds.length - 1] : null);
  }, []);

  const handleEdgeSelection = (edge: Edge | null) => {
    if (edge?.id !== selectedEdgeId && (edge || selectedEdgeId)) {
      logger.info(
        `(Editor) Selected edge ${edge?.id}, current: ${selectedEdgeId}`,
      );
      setSelectedEdgeId(edge?.id || null);
    }
  };

  const handleDeleteNodeOrEdge = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      logger.info("Deleting nodes", selectedNodeIds);
      if(selectedNodeIds && selectedNodeIds.includes(rootNodeId)) {
        toast.warning("Cannot delete the root idea node 🙈")
        return
      }

      const deleteNodes = nodes.filter((node) =>
        selectedNodeIds.includes(node.id),
      );

      deleteElements({ nodes: deleteNodes, edges: [] });

      setSelectedNodeIds([]);
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      toast.warning("Can't delete the relations. Delete the node instead.")
      return
    }
  }, [selectedNodeIds, selectedEdgeId, nodes, setNodes]);

  const handleSearchFocus = useCallback(() => {
    logger.info("Focusing search input");
    const searchInput = document.querySelector<HTMLInputElement>(
      "#search-resources-input",
    );

    searchInput?.focus();
  }, []);

  const handleNodeDoubleClick = useCallback(() => {
    setTimeout(() => {
      if (selectedEdgeId) {
        propertiesPanelRef.current?.focusEdgeLabelInput();
      } else if (selectedNode) {
        if (selectedNode.type?.startsWith("azure")) {
          propertiesPanelRef.current?.focusNameInput();
        } 
        // Comment or remove this else block to remove focusing description
        // else {
        //   propertiesPanelRef.current?.focusDescriptionInput();
        // }
      }
    }, 20);
  }, [selectedEdgeId, selectedNode]);

  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);

    if (selectedNodes.length > 0) {
      setCopiedNodes(selectedNodes);
      setPasteCount(0); // Reset paste count when copying
      toast.success(
        `Copied ${selectedNodes.length} node${selectedNodes.length > 1 ? "s" : ""}`,
      );
    }
  }, [nodes]);

  const handlePaste = useCallback(() => {
    if (copiedNodes.length === 0) return;

    // Unselect all nodes from canvas before pasting
    setNodes((prev) =>
      prev.map((node) => (node.selected ? { ...node, selected: false } : node)),
    );

    const newNodes = copiedNodes.map((node) => ({
      ...node,
      id: crypto.randomUUID(),
      position: {
        x: node.position.x + 20 * (pasteCount + 1),
        y: node.position.y + 20 * (pasteCount + 1),
      },
      selected: true,
    }));

    setNodes((prev) => [...prev, ...newNodes]);
    setPasteCount((count) => count + 1);
    toast.success(
      `Pasted ${newNodes.length} node${newNodes.length > 1 ? "s" : ""}`,
    );
  }, [copiedNodes, setNodes, pasteCount]);

  const handleEdgeDirectionSwitch = useCallback(() => {
    if (!selectedEdgeId) return;

    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === selectedEdgeId
          ? {
              ...edge,
              source: edge.target,
              sourceHandle: edge.targetHandle,
              target: edge.source,
              targetHandle: edge.sourceHandle,
            }
          : edge,
      ),
    );
  }, [selectedEdgeId, setEdges]);

  const handleEdgeMarkerChange = useCallback(
    (markerStart: boolean, markerEnd: boolean) => {
      if (!selectedEdgeId) return;

      setEdges((edges) =>
        edges.map((edge) =>
          edge.id === selectedEdgeId
            ? {
                ...edge,
                markerStart: markerStart
                  ? {
                      type: MarkerType.ArrowClosed,
                      width: 30,
                      height: 30,
                    }
                  : undefined,
                markerEnd: markerEnd
                  ? {
                      type: MarkerType.ArrowClosed,
                      width: 30,
                      height: 30,
                    }
                  : undefined,
              }
            : edge,
        ),
      );
    },
    [selectedEdgeId, setEdges],
  );

  
  const handleTabKey = useCallback(() => {

    if (!selectedNode || !selectedNodeId || selectedNode?.data.isEditing) return;
  
    const rootNode = nodes.find(node => node.id === rootNodeId);
    if (!rootNode) return;
  
    console.debug(`Root node: ${rootNode.id} selected node: ${selectedNodeId}`);
    const isSelectedNodeRoot = selectedNode.id === rootNode.id;
    logger.debug(`Selected node is root: ${isSelectedNodeRoot}`);
    const selectedNodePosition = getAbsolutePosition( selectedNode, nodes);
    const rootPosition = rootNode.position;

    // Check how far from root we are, for example root -> node -> new node would be depth 2
    const mindMapDepthLevel = (currentNode: DiagramElement): number => {
      let depth = 0;
      let node = currentNode;
      
      while (node.parentId) {
      depth++;
      node = nodes.find(n => n.id === node.parentId) || node;
      }
      
      return depth;
    };

    const currentDepth = mindMapDepthLevel(selectedNode);
    logger.debug(`Current depth level: ${currentDepth}`);
    
    let shouldAddToRight = true;
    if (isSelectedNodeRoot) {
      // For root node, compare number of connections on each side
      const leftConnections = rootLeftConnections.length;
      const rightConnections = rootRightConnections.length;
      logger.debug(`Root node connections: left=${leftConnections}, right=${rightConnections}`);
      shouldAddToRight = leftConnections >= rightConnections;
    } else {
      // For non-root nodes, use position relative to root
      shouldAddToRight = selectedNodePosition.x > rootPosition.x;
    }

    logger.debug(`Adding new node to ${shouldAddToRight ? 'right' : 'left'}`);
  
    const basePosition = {
      x: shouldAddToRight ? 240 : -240,
      y: 0,
    };
  
    const spacing = currentDepth == 0 ? 100 :
    currentDepth == 1 ? 60 :
    currentDepth == 2 ? 40 : 20;

    // Find a free position for the new node using getIntersectingNodes
    const freePosition = findFreePosition(
      nodes,
      basePosition,
      spacing,
      selectedNodeId,
      getIntersectingNodes
    );
  
    const newNode: DiagramElement = {
      id: crypto.randomUUID(),
      type: 'rectangleShape',
      position: freePosition,
      data: {
        description: '',
        resourceType: 'generic',
        textProperties: getDefaultTextProperties('generic'),
        isEditing: true,
      },
      //width: 100,
      //height: 40,
      selected: true,
      parentId: selectedNodeId,
    };
  
    // Create edge between selected node and new node with proper handles
    const newEdge: Edge = {
      id: `e-${selectedNodeId}-${newNode.id}`,
      source: selectedNodeId,
      target: newNode.id,
      sourceHandle: shouldAddToRight ? `${selectedNodeId}-right-source` : `${selectedNodeId}-left-source`,
      targetHandle: shouldAddToRight ? `${newNode.id}-left-target` : `${newNode.id}-right-target`,
      type: 'default',
    };
  
    // Update nodes and edges
    setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);
    setEdges((eds) => [...eds, newEdge]);
  
    // Set the new node as selected
    setSelectedNodeId(newNode.id);
    setSelectedNodeIds([newNode.id]);
  }, [selectedNodeId, selectedNode, nodes, setNodes, setEdges, getIntersectingNodes, rootLeftConnections, rootRightConnections]);
  
  const handleEnterKey = useCallback(() => {
    if (!selectedNode || !selectedNodeId || selectedNode?.data.isEditing) return;

    const rootNode = nodes.find(node => !node.parentId);
    if (!rootNode) return;

    const isSelectedNodeRoot = selectedNode.id === rootNodeId;
    if(isSelectedNodeRoot) return;

    const parentNode = nodes.find(node => node.id === selectedNode.parentId);
    const parentNodeId = parentNode?.id;
    
    const selectedNodePosition = getAbsolutePosition( selectedNode, nodes);
    const rootPosition = rootNode.position;
    const shouldAddAbove = selectedNodePosition.y > rootPosition.y;

    const shouldAddToRight = isSelectedNodeRoot || selectedNodePosition.x > rootPosition.x;

    const basePosition = {
      x: shouldAddToRight ? 240 : -240,
      y: shouldAddAbove ? -60 : 60,
    };

    // Find a free position for the new node using getIntersectingNodes
    const freePosition = findFreePosition(
      nodes,
      basePosition,
      60,
      parentNodeId,
      getIntersectingNodes
    );

    const newNode: DiagramElement = {
      id: crypto.randomUUID(),
      type: 'rectangleShape',
      position: freePosition,
      data: {
        description: '',
        resourceType: 'generic',
        textProperties: getDefaultTextProperties('generic'),
        isEditing: true,
      },
      //width: 100,
      //height: 40,
      selected: true,
      parentId: selectedNode.parentId,
    };

    // Create edge between parent node and new node (if parent exists)
    const newEdges = [...edges];
    if (parentNodeId) {
      const newEdge: Edge = {
        id: `e-${parentNodeId}-${newNode.id}`,
        source: parentNodeId,
        target: newNode.id,
        sourceHandle: shouldAddToRight ? `${parentNodeId}-right-source` : `${parentNodeId}-left-source`,
        targetHandle: shouldAddToRight ? `${newNode.id}-left-target` : `${newNode.id}-right-target`,
        type: 'default',
      };
      newEdges.push(newEdge);
    }

    // Update nodes and edges
    setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);
    setEdges(newEdges);

    // Set the new node as selected
    setSelectedNodeId(newNode.id);
    setSelectedNodeIds([newNode.id]);
  }, [selectedNodeId, selectedNode, nodes, edges, setNodes, setEdges, getIntersectingNodes]);

  const handleArrowNavigation = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (!selectedNode) return;

      const closestNode = findClosestNodeInDirection(selectedNode, nodes, direction);
      if (closestNode) {
        // Unselect all nodes
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            selected: node.id === closestNode.id,
          }))
        );
        setSelectedNodeId(closestNode.id);
        setSelectedNodeIds([closestNode.id]);
      }
    },
    [selectedNode, nodes, setNodes]
  );

  useKeyboardShortcuts({
    onDelete: handleDeleteNodeOrEdge,
    onSearch: handleSearchFocus,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onTab: handleTabKey,  // Add the new handler
    onEnter: handleEnterKey,  // Add the new handler
    onArrowLeft: () => handleArrowNavigation("left"),
    onArrowRight: () => handleArrowNavigation("right"),
    onArrowUp: () => handleArrowNavigation("up"),
    onArrowDown: () => handleArrowNavigation("down"),
  });

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden">
      <Menubar
        onCopyJsonToClipboard={copyJsonToClipboard}
        onNewProject={onNewProject}
      />
      <Toolbar
        onCopy={handleCopy}
        onDeleteNodeOrEdge={handleDeleteNodeOrEdge}
        onPaste={handlePaste}
        onRestoreDiagram={onRestoreDiagram}
        onSaveDiagram={saveDiagram}
        onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
        onToggleProperties={() =>
          setIsPropertiesPanelVisible(!isPropertiesPanelVisible)
        }
        onToggleResources={() =>
          setIsResourcePanelVisible(!isResourcePanelVisible)
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex-1 relative"
          onDoubleClick={() => handleNodeDoubleClick()}
        >
          <Canvas
            edges={edges}
            nodes={nodes}
            setEdges={setEdges}
            onEdgeSelect={handleEdgeSelection}
            onEdgesChange={onEdgesChange}
            onNodeSelect={handleNodeSelection}
            onNodesChange={onNodesChange}
          />
        </div>
        {isPropertiesPanelVisible && (
          <PropertiesPanel
            ref={propertiesPanelRef}
            selectedEdge={edges.find((edge) => edge.id === selectedEdgeId)}
            selectedNode={selectedNode}
            onDescriptionChange={handleNodeDescriptionChange}
            onEdgeAnimatedChange={handleEdgeAnimatedChange}
            onEdgeDirectionSwitch={handleEdgeDirectionSwitch}
            onEdgeLabelChange={handleEdgeLabelChange}
            onEdgeMarkerChange={handleEdgeMarkerChange}
            onNameChange={handleNodeNameChange}
            onResourceOptionChange={handleResourceOptionChange}
            onSkuChange={handleNodeSkuChange}
            onTextPropertiesChange={handleTextPropertiesChange}
          />
        )}
      </div>
    </div>
  );
}
