import {
  Request as NodeRequest,
  FormData as NodeFormData,
} from "@remix-run/web-fetch";
import { Blob, File } from "@remix-run/web-file";

import { parseMultipartFormData } from "../formData";

describe("parseMultipartFormData", () => {
  it("can use a custom upload handler", async () => {
    let formData = new NodeFormData();
    formData.set("a", "value");
    formData.set("blob", new Blob(["blob"]), "blob.txt");
    formData.set("file", new File(["file"], "file.txt"));

    let req = new NodeRequest("https://test.com", {
      method: "post",
      body: formData,
    });

    let parsedFormData = await parseMultipartFormData(
      req,
      async ({ filename, data, contentType }) => {
        let chunks = [];
        for await (let chunk of data) {
          chunks.push(chunk);
        }
        if (filename) {
          return new File(chunks, filename, { type: contentType });
        }

        return await new Blob(chunks, { type: contentType }).text();
      }
    );

    expect(parsedFormData.get("a")).toBe("value");
    let blob = parsedFormData.get("blob") as Blob;
    expect(await blob.text()).toBe("blob");
    let file = parsedFormData.get("file") as File;
    expect(file.name).toBe("file.txt");
    expect(await file.text()).toBe("file");
  });

  it("can throw errors in upload handlers", async () => {
    class CustomError extends Error {
      constructor() {
        super("test error");
      }
    }

    let formData = new NodeFormData();
    formData.set("blob", new Blob(["blob"]), "blob.txt");

    let req = new NodeRequest("https://test.com", {
      method: "post",
      body: formData,
    });

    try {
      await parseMultipartFormData(req, async () => {
        throw new CustomError();
      });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err.message).toBe("test error");
      expect(err).toBeInstanceOf(CustomError);
    }
  });
});
