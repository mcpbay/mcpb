export interface IDownloadFileWithProgressArguments {
  url: string;
  path: string;
}

export async function downloadFileWithProgress(
  args: IDownloadFileWithProgressArguments,
) {
  const { url, path: filename } = args;

  const response = await fetch(url);
  const isResponseOk = response.ok;

  if (!isResponseOk) {
    const errorMessage =
      `Failed to download file: ${response.status} ${response.statusText}`;

    throw new Error(errorMessage);
  }

  const contentLength = response.headers.get("Content-Length");
  const hasContentLength = contentLength !== null;
  const totalBytes = hasContentLength ? parseInt(contentLength, 10) : 0;

  const file = await Deno.open(filename, {
    write: true,
    create: true,
    truncate: true,
  });

  const body = response.body;
  const hasBody = body !== null;

  if (!hasBody) {
    file.close();

    const errorMessage = "Response body is empty";

    throw new Error(errorMessage);
  }

  const reader = body.getReader();
  let downloadedBytes = 0;

  try {
    while (true) {
      const readResult = await reader.read();
      const { done, value } = readResult;

      const isDownloadComplete = done;

      if (isDownloadComplete) {
        break;
      }

      const hasValue = value !== undefined;

      if (hasValue) {
        await file.write(value);
        downloadedBytes += value.length;

        const canShowProgress = hasContentLength && totalBytes > 0;

        if (canShowProgress) {
          const progressPercentage = (downloadedBytes / totalBytes) * 100;
          const downloadedMB = (downloadedBytes / 1024 / 1024).toFixed(2);
          const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
          const progressText = `\rDownloading: ${
            progressPercentage.toFixed(1)
          }% (${downloadedMB}MB / ${totalMB}MB)`;

          await Deno.stdout.write(new TextEncoder().encode(progressText));
        }
      }
    }

    await Deno.stdout.write(new TextEncoder().encode("\n"));
  } finally {
    file.close();
  }

  console.log(`Downloaded to ${filename}`);
}
