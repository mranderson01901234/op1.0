// pages/api/list-directory.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { path } = req.query;

  if (!path || typeof path !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid path parameter' });
  }

  try {
    // Call the list_directory API to get the directory contents
    const directoryContents = await listDirectory(path);

    // Check if the API call was successful
    if (!directoryContents || directoryContents.error) {
      console.error('Error listing directory:', directoryContents?.error);
      return res.status(500).json({ error: 'Failed to list directory' });
    }

    // Extract the files and directories from the response
    const files = directoryContents.files.map((item: any) => ({
      name: item.name,
      type: item.type,
    }));

    // Return the directory contents as JSON
    res.status(200).json({ files });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function listDirectory(path: string) {
  // Call the actual list_directory API here
  // Replace this with the actual API call
  // Example:
  try {
    const response = await fetch('http://localhost:8000/list_directory', { // Replace with your API endpoint
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: path }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Could not call list_directory", error)
    return { error: error }
  }
}
