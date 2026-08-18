import { db, storage, FieldValue } from './firebaseConfig';
import * as FileSystem from 'expo-file-system';

export interface GalleryAlbum {
  id: string;
  name: string;
  description: string;
  coverPhotoUrl: string;
  date: string;
  visibility: 'Public' | 'Private';
  createdAt: any;
  photoCount: number;
}

export interface GalleryPhoto {
  id: string;
  albumId: string;
  url: string;
  uploadedAt: any;
  uploadedBy?: string;
}

class GalleryService {
  /**
   * Upload a single image to Firebase Storage
   */
  async uploadImage(localUri: string, path: string): Promise<string> {
    try {
      const reference = storage().ref(path);
      await reference.putFile(localUri);
      
      const url = await reference.getDownloadURL();
      return url;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Create a new Album
   */
  async createAlbum(data: Partial<GalleryAlbum>, coverUri: string): Promise<string> {
    try {
      const albumRef = db.collection('church_gallery_albums').doc();
      const albumId = albumRef.id;

      let coverUrl = '';
      if (coverUri) {
        coverUrl = await this.uploadImage(coverUri, `church_gallery/${albumId}/cover_${Date.now()}.jpg`);
      }

      const albumData = {
        ...data,
        id: albumId,
        coverPhotoUrl: coverUrl,
        createdAt: FieldValue.serverTimestamp(),
        photoCount: coverUrl ? 1 : 0
      };

      await albumRef.set(albumData);
      
      if (coverUrl) {
        const photoId = db.collection('church_gallery_photos').doc().id;
        await db.collection('church_gallery_photos').doc(photoId).set({
          id: photoId,
          albumId,
          url: coverUrl,
          uploadedAt: FieldValue.serverTimestamp(),
          uploadedBy: 'Admin'
        });
      }

      return albumId;
    } catch (error) {
      console.error('Error creating album:', error);
      throw error;
    }
  }

  /**
   * Get all Albums
   */
  async getAlbums(): Promise<GalleryAlbum[]> {
    try {
      const snapshot = await db.collection('church_gallery_albums')
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => doc.data() as GalleryAlbum);
    } catch (error) {
      console.error('Error fetching albums:', error);
      return [];
    }
  }

  /**
   * Upload multiple photos to an Album
   */
  async uploadPhotosToAlbum(albumId: string, uris: string[], uploadedBy: string = 'Admin'): Promise<void> {
    try {
      const batch = db.batch();
      const albumRef = db.collection('church_gallery_albums').doc(albumId);
      
      // Upload all photos concurrently to drastically speed up upload time
      const uploadPromises = uris.map(async (uri) => {
        const photoId = db.collection('church_gallery_photos').doc().id;
        const photoPath = `church_gallery/${albumId}/photo_${photoId}_${Date.now()}.jpg`;
        try {
          const downloadUrl = await this.uploadImage(uri, photoPath);
          return { photoId, downloadUrl };
        } catch (uploadError) {
          console.error(`Failed to upload photo ${uri}`, uploadError);
          return null;
        }
      });
      
      const uploadedResults = await Promise.all(uploadPromises);
      const successfulUploads = uploadedResults.filter(r => r !== null) as {photoId: string, downloadUrl: string}[];
      
      for (const result of successfulUploads) {
        const photoRef = db.collection('church_gallery_photos').doc(result.photoId);
        batch.set(photoRef, {
          id: result.photoId,
          albumId,
          url: result.downloadUrl,
          uploadedAt: FieldValue.serverTimestamp(),
          uploadedBy
        });
      }
      
      // Update the total count on the album document
      batch.update(albumRef, {
        photoCount: FieldValue.increment(successfulUploads.length)
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error uploading batch of photos:', error);
      throw error;
    }
  }

  /**
   * Get Photos for a specific Album
   */
  async getAlbumPhotos(albumId: string): Promise<GalleryPhoto[]> {
    try {
      const snapshot = await db.collection('church_gallery_photos')
        .where('albumId', '==', albumId)
        .orderBy('uploadedAt', 'desc')
        .get();
        
      return snapshot.docs.map(doc => doc.data() as GalleryPhoto).reverse();
    } catch (error) {
      console.error('Error fetching album photos:', error);
      return [];
    }
  }

  /**
   * Delete a single Photo
   */
  async deletePhoto(photoId: string, albumId: string, url: string): Promise<void> {
    try {
      // 1. Delete from DB
      await db.collection('church_gallery_photos').doc(photoId).delete();
      
      // 2. Decrement photo count in Album
      await db.collection('church_gallery_albums').doc(albumId).update({
        photoCount: FieldValue.increment(-1)
      });
      
      // 3. Delete from Storage
      try {
        if (url) {
          await storage().refFromURL(url).delete();
        }
      } catch (storageError) {
        console.error('Failed to delete photo from storage:', storageError);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  }

  /**
   * Delete an Album and all its photos
   */
  async deleteAlbum(albumId: string, coverPhotoUrl: string): Promise<void> {
    try {
      // 1. Fetch all photos
      const photos = await this.getAlbumPhotos(albumId);
      
      const batch = db.batch();
      for (const photo of photos) {
        batch.delete(db.collection('church_gallery_photos').doc(photo.id));
      }
      batch.delete(db.collection('church_gallery_albums').doc(albumId));
      
      await batch.commit();
      
      // 2. Delete all photos from Storage
      for (const photo of photos) {
        try {
          if (photo.url) {
            await storage().refFromURL(photo.url).delete();
          }
        } catch (e) {
          console.warn('Failed to delete photo from storage', e);
        }
      }
      
      // 3. Delete cover photo from Storage
      if (coverPhotoUrl) {
        try {
          await storage().refFromURL(coverPhotoUrl).delete();
        } catch (e) {
          console.warn('Failed to delete cover photo from storage', e);
        }
      }

    } catch (error) {
      console.error('Error deleting album:', error);
      throw error;
    }
  }
}

export default new GalleryService();
