import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, Textarea } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import type { NodeData } from "../../../types/graph";
import useFile from "../../../store/useFile";
import useGraph from "../../editor/views/GraphView/stores/useGraph";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const updateNodeValue = useFile(state => state.updateNodeValue);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState("");

  // Reset edit mode when modal opens/closes or node changes
  React.useEffect(() => {
    if (opened && nodeData) {
      setIsEditMode(false);
      setEditedContent(normalizeNodeData(nodeData.text));
    }
  }, [opened, nodeData]);

  const handleEdit = () => {
    setIsEditMode(true);
    gaEvent("edit_node_start");
  };

  const handleSave = () => {
    try {
      // Parse the edited content to validate JSON
      const parsedContent = JSON.parse(editedContent);
      
      // Update the node value using the path
      if (nodeData?.path) {
        updateNodeValue(nodeData.path, parsedContent);
        toast.success("Node updated successfully");
        gaEvent("edit_node_save");
        setIsEditMode(false);
        onClose();
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error("Invalid JSON: " + error.message);
      } else {
        toast.error("Failed to update node");
      }
    }
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditedContent(normalizeNodeData(nodeData?.text ?? []));
    gaEvent("edit_node_cancel");
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <Flex gap="xs">
              {!isEditMode && (
                <Button size="xs" onClick={handleEdit}>
                  Edit
                </Button>
              )}
              <CloseButton onClick={onClose} />
            </Flex>
          </Flex>
          {isEditMode ? (
            <Stack gap="xs">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.currentTarget.value)}
                minRows={6}
                maxRows={12}
                miw={350}
                maw={600}
                autosize
                styles={{
                  input: {
                    fontFamily: "monospace",
                    fontSize: "12px",
                  },
                }}
              />
              <Flex gap="xs" justify="flex-end">
                <Button size="xs" variant="default" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="xs" color="green" onClick={handleSave}>
                  Save
                </Button>
              </Flex>
            </Stack>
          ) : (
            <ScrollArea.Autosize mah={250} maw={600}>
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            </ScrollArea.Autosize>
          )}
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
