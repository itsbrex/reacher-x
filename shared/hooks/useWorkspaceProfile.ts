import { useAuth } from "@/shared/hooks/useAuth";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  getWorkspaceDescription,
  storeWorkspaceDescription,
  getWorkspaceName,
  storeWorkspaceName,
} from "@/shared/lib/utils/localStorage";

export function useWorkspaceProfile() {
  const { isAuthenticated, workspace } = useAuth();
  const updateWorkspace = useMutation(api.workspaces.updateWorkspace);

  const description =
    isAuthenticated && workspace
      ? workspace.description
      : getWorkspaceDescription() || "";
  const name =
    isAuthenticated && workspace
      ? workspace.name
      : getWorkspaceName() || "Default workspace";

  const setDescription = async (value: string) => {
    if (isAuthenticated && workspace) {
      await updateWorkspace({ workspaceId: workspace._id, description: value });
    } else {
      storeWorkspaceDescription(value);
    }
  };

  const setName = async (value: string) => {
    if (isAuthenticated && workspace) {
      await updateWorkspace({ workspaceId: workspace._id, name: value });
    } else {
      storeWorkspaceName(value);
    }
  };

  return { description, name, setDescription, setName };
}
