import { AppBar, Toolbar as MUIToolbar, Box } from "@mui/material";
import { IconButton } from "@mui/material";
import { TbLayoutSidebarRightCollapseFilled } from "react-icons/tb";
import { MdFullscreen } from "react-icons/md";
import {
  PiClipboardThin,
  PiCopyThin,
  PiFloppyDiskThin,
  PiFolderOpenThin,
  PiGridFour,
  PiTrashThin,
} from "react-icons/pi";

interface ToolbarProps {
  onToggleProperties: () => void;
  onToggleFullScreen: () => void;
  onSaveMindMap: () => void;
  onLoadMindMap: () => void;
  onDeleteNodeOrEdge: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onToggleGrid?: () => void;
}

export const Toolbar = ({
  onToggleProperties,
  onToggleFullScreen,
  onSaveMindMap,
  onLoadMindMap,
  onDeleteNodeOrEdge,
  onCopy,
  onPaste,
  onToggleGrid,
}: ToolbarProps) => {
  return (
    <AppBar
      className="bg-toolBar-background shadow-stone-500 shadow-md"
      elevation={0}
      position="sticky"
    >
      <MUIToolbar
        className="bg-toolBar-background border-b border-solid border-0 border-b-panels-border text-toolBar-text"
        variant="dense"
      >
        <Box className="flex-1 flex flex-nowrap [&_button]:text-fallLight">
          <IconButton
            aria-label="Load mindmap"
            size="medium"
            title="Load mindmap"
            onClick={() => {
              onLoadMindMap();
            }}
          >
            <PiFolderOpenThin />
          </IconButton>
          <IconButton
            aria-label="Save mindmap"
            size="medium"
            title="Save mindmap"
            onClick={() => {
              onSaveMindMap();
            }}
          >
            <PiFloppyDiskThin />
          </IconButton>
          <div className="h-6 my-4 mx-2 pr-1 border-0 border-r border-panels-border border-solid inline-block" />
          <IconButton
            aria-label="Copy selected nodes"
            size="medium"
            title="Copy selected nodes"
            onClick={onCopy}
          >
            <PiCopyThin />
          </IconButton>
          <IconButton
            aria-label="Paste nodes"
            size="medium"
            title="Paste nodes"
            onClick={onPaste}
          >
            <PiClipboardThin />
          </IconButton>

          <div className="h-6 my-4 pr-1 border-0 border-r border-panels-border border-solid inline-block" />
          <IconButton
            aria-label="Delete selected node or edge"
            size="medium"
            title="Delete selected node or edge"
            onClick={onDeleteNodeOrEdge}
          >
            <PiTrashThin />
          </IconButton>
          <div className="h-6 my-4 pr-1 border-0 border-r border-panels-border border-solid inline-block" />
        </Box>
        <Box
          sx={{ flex: "1 1 auto", display: "flex", justifyContent: "flex-end" }}
        >
          <IconButton
            aria-label="Toggle grid"
            size="small"
            onClick={onToggleGrid}
          >
            <PiGridFour />
          </IconButton>
          <IconButton
            aria-label="Toggle menubar"
            size="small"
            onClick={onToggleFullScreen}
          >
            <MdFullscreen />
          </IconButton>
          <IconButton
            aria-label="Toggle properties panel"
            size="small"
            onClick={onToggleProperties}
          >
            <TbLayoutSidebarRightCollapseFilled />
          </IconButton>
        </Box>
      </MUIToolbar>
    </AppBar>
  );
};
