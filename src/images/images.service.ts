import { Injectable } from '@nestjs/common';

@Injectable()
export class ImagesService {
  normalizeImages(images?: string[]): string[] {
    if (!images) {
      return [];
    }

    return Array.from(
      new Set(images.map((image) => image.trim()).filter(Boolean)),
    );
  }
}
