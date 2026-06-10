import { serviceLayerClient } from "@/services/service-layer.service";

/**
 * Uploads a file to SAP Business One Service Layer and returns the AttachmentEntry ID.
 * Uses multipart/form-data to directly stream the buffer to SAP.
 */
export const uploadAttachmentToSAP = async (
  sessionId: string,
  fileBuffer: Buffer,
  originalName: string,
): Promise<number> => {
  const form = new FormData();
  const blob = new Blob([fileBuffer], { type: "application/octet-stream" });
  form.append("file", blob, originalName);

  // POST to /Attachments2
  const response = await serviceLayerClient.request<{ AbsoluteEntry: number }>(
    sessionId,
    "POST",
    "/Attachments2",
    form,
    true, // allow retry
    // No custom headers needed; Axios natively extracts the boundary from native FormData
  );

  return response.AbsoluteEntry;
};
