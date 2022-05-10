import { streamMultipart } from "@web3-storage/multipart-parser";

export type UploadHandlerPart = {
  name: string;
  filename: string;
  contentType: string;
  data: AsyncIterable<Uint8Array>;
};

export type UploadHandler = (
  part: UploadHandlerPart
) => Promise<FormDataEntryValue | null | undefined>;

export function composeUploadHandlers(
  ...handlers: UploadHandler[]
): UploadHandler {
  return async (part) => {
    for (let handler of handlers) {
      let value = await handler(part);
      if (typeof value !== "undefined" && value !== null) {
        return value;
      }
    }

    return undefined;
  };
}

/**
 * Allows you to handle multipart forms (file uploads) for your app.
 *
 * TODO: Update this comment
 * @see https://remix.run/api/remix#parsemultipartformdata-node
 */
export async function parseMultipartFormData(
  request: Request,
  uploadHandler: UploadHandler
): Promise<FormData> {
  let contentType = request.headers.get("Content-Type") || "";
  let [type, boundary] = contentType.split(/\s*;\s*boundary=/);

  if (!request.body || !boundary || type !== "multipart/form-data") {
    throw new TypeError("Could not parse content as FormData.");
  }

  let formData = new FormData();
  let parts: AsyncIterable<UploadHandlerPart & { done?: true }> =
    streamMultipart(request.body, boundary);

  for await (let part of parts) {
    if (part.done) break;

    let value = await uploadHandler(part);
    if (typeof value !== "undefined" && value !== null) {
      formData.append(part.name, value);
    }
  }

  return formData;
}
