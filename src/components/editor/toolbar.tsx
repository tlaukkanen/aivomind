import { AppBar, Toolbar as MUIToolbar, Box } from "@mui/material";
import { IconButton } from "@mui/material";
import { TbLayoutSidebarRightCollapseFilled } from "react-icons/tb";
import { MdFullscreen } from "react-icons/md";
import { toast } from "sonner";
import {
  PiClipboardThin,
  PiCopyThin,
  PiDownloadThin,
  PiTrashThin,
  PiUploadThin,
} from "react-icons/pi";

interface ToolbarProps {
  onToggleProperties: () => void;
  onToggleFullScreen: () => void;
  onSaveDiagram: () => void;
  onRestoreDiagram: () => void;
  onDeleteNodeOrEdge: () => void;
  onCopy: () => void;
  onPaste: () => void;
}

export const Toolbar = ({
  onToggleProperties,
  onToggleFullScreen,
  onSaveDiagram,
  onRestoreDiagram,
  onDeleteNodeOrEdge,
  onCopy,
  onPaste,
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
            aria-label="Save to memory"
            size="medium"
            title="Save to browser memory"
            onClick={() => {
              onSaveDiagram();
              toast.info("Diagram saved to memory");
            }}
          >
            <PiUploadThin />
          </IconButton>
          <IconButton
            aria-label="Restore from memory"
            size="medium"
            title="Restore from browser memory"
            onClick={() => {
              onRestoreDiagram();
              toast.info("Diagram restored from memory");
            }}
          >
            <PiDownloadThin />
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
        </Box>
        <Box
          sx={{ flex: "1 1 auto", display: "flex", justifyContent: "flex-end" }}
        >
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
