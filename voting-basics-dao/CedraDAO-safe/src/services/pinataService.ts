/**
 * Pinata IPFS Service for Cedra DAO
 *
 * Handles image uploads to IPFS via Pinata API
 * Solves transaction size limitations by storing only URLs on-chain
 */

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT;
const PINATA_GATEWAY = import.meta.env.VITE_PINATA_GATEWAY;

export interface PinataUploadResponse {
  success: boolean;
  ipfsUrl: string;
  error?: string;
}

/**
 * Upload a file to Pinata IPFS
 * @param file - The file to upload (logo or background image)
 * @returns Promise with IPFS URL or error
 */
export async function uploadToPinata(file: File): Promise<PinataUploadResponse> {
  try {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured. Please check your .env file.');
    }

    const formData = new FormData();
    formData.append('file', file);

    // Optional: Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        uploadedBy: 'CedraDAO',
        timestamp: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    // Upload to Pinata
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.details || `Upload failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Construct the IPFS URL using the gateway
    const ipfsUrl = `https://${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`;

    return {
      success: true,
      ipfsUrl
    };

  } catch (error) {
    console.error('Pinata upload error:', error);
    return {
      success: false,
      ipfsUrl: '',
      error: error instanceof Error ? error.message : 'Failed to upload to IPFS'
    };
  }
}

/**
 * Upload both logo and background images to Pinata
 * @param logoFile - Logo image file
 * @param backgroundFile - Background image file
 * @returns Promise with both IPFS URLs
 */
export async function uploadDAOImages(
  logoFile: File | null,
  backgroundFile: File | null
): Promise<{
  logoUrl: string;
  backgroundUrl: string;
  error?: string;
}> {
  try {
    const uploads: Promise<PinataUploadResponse>[] = [];

    if (logoFile) {
      uploads.push(uploadToPinata(logoFile));
    }
    if (backgroundFile) {
      uploads.push(uploadToPinata(backgroundFile));
    }

    const results = await Promise.all(uploads);

    let logoUrl = '';
    let backgroundUrl = '';
    let index = 0;

    if (logoFile) {
      const logoResult = results[index++];
      if (!logoResult.success) {
        throw new Error(`Logo upload failed: ${logoResult.error}`);
      }
      logoUrl = logoResult.ipfsUrl;
    }

    if (backgroundFile) {
      const bgResult = results[index];
      if (!bgResult.success) {
        throw new Error(`Background upload failed: ${bgResult.error}`);
      }
      backgroundUrl = bgResult.ipfsUrl;
    }

    return {
      logoUrl,
      backgroundUrl
    };

  } catch (error) {
    console.error('DAO images upload error:', error);
    return {
      logoUrl: '',
      backgroundUrl: '',
      error: error instanceof Error ? error.message : 'Failed to upload images'
    };
  }
}
