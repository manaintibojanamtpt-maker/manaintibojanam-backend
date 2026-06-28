import { 
  getStorage, 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { app, auth } from '../firebase';

/**
 * Firebase Storage Service
 * Handles image uploads for menu items, profiles, etc.
 * 
 * CONFIGURATION:
 * - Firebase project must have Cloud Storage enabled
 * - Storage rules allow authenticated users to upload to /uploads/ directory
 * - Images are automatically compressed client-side before upload
 */

class StorageService {
  private storage = getStorage(app);
  private maxFileSizeBytes = 5 * 1024 * 1024; // 5MB
  private acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  /**
   * Compress image before upload to reduce bandwidth
   * @param file Image file to compress
   * @returns Compressed image blob
   */
  private async compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Set canvas dimensions with max 1200px width
          let width = img.width;
          let height = img.height;
          const maxWidth = 1200;
          const maxHeight = 1200;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with 80% JPEG quality
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  }

  /**
   * Upload menu item image to Firebase Storage
   * @param file Image file from file picker
   * @param menuItemId Unique identifier for menu item (used in storage path)
   * @returns Download URL of uploaded image
   */
  async uploadMenuImage(file: File, menuItemId: string): Promise<string> {
    try {
      // Validate file
      if (!this.acceptedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      }

      if (file.size > this.maxFileSizeBytes) {
        throw new Error(`File size exceeds ${this.maxFileSizeBytes / (1024 * 1024)}MB limit.`);
      }

      // Compress image
      const compressedBlob = await this.compressImage(file);

      // Create storage reference with timestamp for uniqueness
      const timestamp = Date.now();
      const fileName = `${menuItemId}-${timestamp}.jpg`;
      const storageRef = ref(this.storage, `menu-items/${fileName}`);

      // Upload compressed image
      const snapshot = await uploadBytes(storageRef, compressedBlob, {
        contentType: 'image/jpeg',
        customMetadata: {
          menuItemId,
          uploadedAt: new Date().toISOString(),
        },
      });

      console.log('Image uploaded successfully:', snapshot.ref.fullPath);

      // Get and return download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error: any) {
      console.error('Error uploading menu image:', error);
      throw new Error(error.message || 'Failed to upload image');
    }
  }

  /**
   * Delete menu item image from Firebase Storage
   * @param imageUrl Download URL of the image to delete
   */
  async deleteMenuImage(imageUrl: string): Promise<void> {
    try {
      if (!imageUrl) return;

      // Extract storage path from download URL
      const decoded = decodeURIComponent(imageUrl);
      const pathStart = decoded.indexOf('/menu-items/');
      if (pathStart === -1) {
        console.warn('Could not determine storage path for image deletion');
        return;
      }

      const filePath = decoded.substring(pathStart + 1);
      const fileRef = ref(this.storage, filePath);

      await deleteObject(fileRef);
      console.log('Image deleted successfully:', filePath);
    } catch (error: any) {
      console.warn('Error deleting image (may not exist):', error.message);
      // Don't throw - image might already be deleted
    }
  }

  /**
   * Upload profile picture for user/admin
   * @param file Image file
   * @param userId User ID for storage path
   * @returns Download URL
   */
  async uploadProfileImage(file: File, userId: string): Promise<string> {
    try {
      if (!this.acceptedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
      }

      if (file.size > this.maxFileSizeBytes) {
        throw new Error(`File size exceeds ${this.maxFileSizeBytes / (1024 * 1024)}MB limit.`);
      }

      const compressedBlob = await this.compressImage(file);
      const timestamp = Date.now();
      const fileName = `${userId}-${timestamp}.jpg`;
      const storageRef = ref(this.storage, `profiles/${fileName}`);

      const snapshot = await uploadBytes(storageRef, compressedBlob, {
        contentType: 'image/jpeg',
      });

      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      throw new Error(error.message || 'Failed to upload profile image');
    }
  }

  /**
   * Upload KYC document (Private, secure path)
   */
  async uploadKYCDocument(
    file: File,
    tenantId: string,
    docType: string,
    onProgress?: (percent: number) => void,
  ): Promise<string> {
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit.');
    }

    const user = auth.currentUser;
    if (!user) {
      throw new Error('Please sign in again to upload documents.');
    }

    await user.getIdToken(true);

    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'bin';
    const fileName = `${docType}-${timestamp}.${extension}`;
    const storageRef = ref(this.storage, `kyc/${tenantId}/${fileName}`);

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
    });

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        uploadTask.cancel();
        reject(new Error('Upload timed out. Check your connection and try again.'));
      }, 90000);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = snapshot.totalBytes
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          onProgress?.(progress);
        },
        (error) => {
          window.clearTimeout(timeoutId);
          console.error('Error uploading KYC document:', error);
          const code = (error as { code?: string }).code;
          if (code === 'storage/unauthorized') {
            reject(new Error('Upload denied. Confirm you are signed in as the kitchen owner.'));
            return;
          }
          reject(new Error(error.message || 'Failed to upload KYC document'));
        },
        async () => {
          window.clearTimeout(timeoutId);
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to get download URL';
            reject(new Error(message));
          }
        },
      );
    });
  }

  /**
   * Validate file before upload
   * @param file File to validate
   * @returns Validation error message or null if valid
   */
  validateFile(file: File): string | null {
    if (!this.acceptedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, or WebP image.';
    }

    if (file.size > this.maxFileSizeBytes) {
      return `File size exceeds ${this.maxFileSizeBytes / (1024 * 1024)}MB limit.`;
    }

    return null;
  }
}

export default new StorageService();
