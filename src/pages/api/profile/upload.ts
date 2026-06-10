import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';

interface UploadResponse {
  publicUrl?: string;
  error?: string;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '8mb',
    },
  },
};

const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, fileName, fileData } = req.body as {
    uid?: string;
    fileName?: string;
    fileData?: string;
  };

  if (!uid || !fileName || !fileData) {
    return res.status(400).json({ error: 'Invalid upload payload.' });
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!VALID_EXTENSIONS.includes(ext)) {
    return res.status(400).json({ error: 'Unsupported image format.' });
  }

  try {
    const profilesDir = path.join(process.cwd(), 'public', 'profiles');
    await fs.mkdir(profilesDir, { recursive: true });

    const filePath = path.join(profilesDir, `${uid}${ext}`);
    const base64Data = fileData.replace(/^data:.*;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    await fs.writeFile(filePath, buffer);

    return res.status(200).json({ publicUrl: `/profiles/${uid}${ext}` });
  } catch (error) {
    console.error('Profile upload failed:', error);
    return res.status(500).json({ error: 'Failed to upload profile image.' });
  }
}
