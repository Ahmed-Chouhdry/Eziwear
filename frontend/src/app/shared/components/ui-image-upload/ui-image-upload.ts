import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminUploadService, UploadFolder } from '../../../core/services/admin-upload.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiSpinner } from '../ui-spinner/ui-spinner';

const MAX_BYTES = 8 * 1024 * 1024;

/** Extracts a Cloudinary public_id from one of our own secure URLs, for best-effort cleanup on replace/remove. */
function cloudinaryPublicId(url: string): string | null {
  const m = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
  return url.includes('res.cloudinary.com') && m ? m[1]! : null;
}

let uid = 0;

@Component({
  selector: 'ui-image-upload',
  standalone: true,
  imports: [UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ui-image-upload.html',
  styleUrl: './ui-image-upload.scss',
})
export class UiImageUpload {
  private readonly api = inject(AdminUploadService);
  private readonly toast = inject(ToastService);

  readonly value = input<string | null>('');
  readonly folder = input<UploadFolder>('products');
  readonly label = input('Image');
  readonly valueChange = output<string>();

  protected readonly inputId = `iu-${++uid}`;
  protected readonly uploading = signal(false);

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      this.toast.error('Please choose an image file.');
      return;
    }
    if (file.size > MAX_BYTES) {
      this.toast.error('Image must be under 8MB.');
      return;
    }

    this.uploading.set(true);
    try {
      const result = await firstValueFrom(this.api.upload(file, this.folder()));
      const previous = this.value();
      this.valueChange.emit(result.url);
      if (previous) this.cleanupIfCloudinary(previous);
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.uploading.set(false);
    }
  }

  setManualUrl(url: string): void {
    this.valueChange.emit(url.trim());
  }

  clear(): void {
    const previous = this.value();
    this.valueChange.emit('');
    if (previous) this.cleanupIfCloudinary(previous);
  }

  private cleanupIfCloudinary(url: string): void {
    const publicId = cloudinaryPublicId(url);
    if (publicId) this.api.remove(publicId).subscribe({ error: () => undefined });
  }
}
