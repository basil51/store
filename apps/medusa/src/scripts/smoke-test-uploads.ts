import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type FileRecord = {
  id: string
  url: string
}

type FileModuleService = {
  createFiles: (input: {
    filename: string
    mimeType: string
    content: string
  }) => Promise<FileRecord>
  deleteFiles: (id: string) => Promise<void>
}

export default async function smokeTestUploads({ container }: ExecArgs) {
  const fileModule = container.resolve<FileModuleService>(Modules.FILE)
  const marker = `medusa-upload-smoke-test:${new Date().toISOString()}`
  const filename = `smoke-test-${Date.now()}.txt`

  const file = await fileModule.createFiles({
    filename,
    mimeType: "text/plain",
    content: Buffer.from(marker, "utf8").toString("base64"),
  })

  const response = await fetch(file.url)

  if (!response.ok) {
    throw new Error(
      `Uploaded file is not publicly readable: ${response.status} ${response.statusText} (${file.url})`
    )
  }

  const body = await response.text()

  if (body !== marker) {
    throw new Error(
      `Uploaded file contents mismatch. Expected \"${marker}\" but received \"${body}\".`
    )
  }

  await fileModule.deleteFiles(file.id)

  console.log("Upload smoke test passed")
  console.log(`File URL: ${file.url}`)
  console.log(`Verified contents: ${body}`)
}