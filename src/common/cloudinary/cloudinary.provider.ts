import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { Provider } from '@nestjs/common';

interface CloudinaryConfig {
  config: (options: {
    cloud_name: string;
    api_key: string;
    api_secret: string;
  }) => void;
  uploader: {
    upload: (file: string, options?: any) => Promise<any>;
  };
}
// TODO ================= CUSTOM CLOUDINARY PROVIDER ==============
export const CloudinaryProvider: Provider = {
  provide: 'CLOUDINARY',
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    (cloudinary as unknown as CloudinaryConfig).config({
      cloud_name: config.get<string>('CLOUDINARY_CLOUD_NAME')!,
      api_key: config.get<string>('CLOUDINARY_API_KEY')!,
      api_secret: config.get<string>('CLOUDINARY_API_SECRET')!,
    });
    return cloudinary as unknown as CloudinaryConfig;
  },
};
