import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { Dirent } from 'fs';

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

    // Clear any Next.js image/cache files referencing this uid so profile updates appear instantly
    try {
      const nextDir = path.join(process.cwd(), '.next');
      async function walkAndDelete(dir: string) {
        let entries: Dirent[] = [];
        try {
          entries = await fs.readdir(dir, { withFileTypes: true });
        } catch (e) {
          return;
        }

        await Promise.all(entries.map(async (entry) => {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walkAndDelete(full);
          } else if (entry.isFile()) {
            if (uid && entry.name.includes(uid)) {
              try {
                await fs.unlink(full);
                console.log('[ProfileUpload] Removed Next cache file:', full);
              } catch (e) {
                console.error('[ProfileUpload] Failed removing cache file:', full, e);
              }
            }
          }
        }));
      }

      await walkAndDelete(nextDir);
    } catch (e) {
      console.error('[ProfileUpload] Error clearing Next cache for uid', uid, e);
    }

    // Append timestamp query to bust caches so clients fetch the updated image
    return res.status(200).json({ publicUrl: `/profiles/${uid}${ext}?t=${Date.now()}` });
  } catch (error) {
    console.error('Profile upload failed:', error);
    return res.status(500).json({ error: 'Failed to upload profile image.' });
  }
}
