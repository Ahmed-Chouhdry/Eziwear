import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  AdminAd,
  AdminContentService,
  AdminSlider,
  AdminSocialLink,
  AdPayload,
  SliderPayload,
  SocialLinkPayload,
} from '../../../core/services/admin-content.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiImageUpload } from '../../../shared/components/ui-image-upload/ui-image-upload';
import { UiSkeleton } from '../../../shared/components/ui-skeleton/ui-skeleton';

@Component({
  selector: 'app-sliders-ads',
  standalone: true,
  imports: [ReactiveFormsModule, SlicePipe, UiSkeleton, UiImageUpload],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sliders-ads.html',
  styleUrl: './sliders-ads.scss',
})
export class SlidersAds {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmSvc = inject(ConfirmService);
  private readonly api = inject(AdminContentService);

  protected readonly tab = signal<'sliders' | 'ads' | 'social'>('sliders');

  // ---------- sliders ----------
  protected readonly slidersRes = rxResource({ stream: () => this.api.sliders() });
  protected readonly slidersLoading = () => this.slidersRes.isLoading();
  protected readonly sliders = () => this.slidersRes.value() ?? [];

  protected readonly editingSliderId = signal<number | 'new' | null>(null);
  protected readonly savingSlider = signal(false);
  protected readonly movingSliderId = signal<number | null>(null);

  protected readonly sliderForm = this.fb.nonNullable.group({
    title: [''],
    subtitle: [''],
    imageUrl: ['', [Validators.required]],
    imageUrlMobile: [''],
    buttonText: [''],
    buttonLink: [''],
    status: ['active' as 'active' | 'inactive'],
  });

  startAddSlider(): void {
    this.sliderForm.reset({ status: 'active' });
    this.editingSliderId.set('new');
  }
  startEditSlider(s: AdminSlider): void {
    this.sliderForm.reset({
      title: s.title ?? '',
      subtitle: s.subtitle ?? '',
      imageUrl: s.imageUrl,
      imageUrlMobile: s.imageUrlMobile ?? '',
      buttonText: s.buttonText ?? '',
      buttonLink: s.buttonLink ?? '',
      status: s.status,
    });
    this.editingSliderId.set(s.id);
  }
  cancelSlider(): void {
    this.editingSliderId.set(null);
  }

  async saveSlider(): Promise<void> {
    if (this.sliderForm.invalid) {
      this.sliderForm.markAllAsTouched();
      return;
    }
    const v = this.sliderForm.getRawValue();
    const payload: SliderPayload = {
      title: v.title || undefined,
      subtitle: v.subtitle || undefined,
      imageUrl: v.imageUrl,
      imageUrlMobile: v.imageUrlMobile || undefined,
      buttonText: v.buttonText || undefined,
      buttonLink: v.buttonLink || undefined,
      status: v.status,
    };
    this.savingSlider.set(true);
    try {
      const id = this.editingSliderId();
      if (id === 'new') {
        await firstValueFrom(this.api.createSlider(payload));
        this.toast.success('Slider created.');
      } else if (typeof id === 'number') {
        await firstValueFrom(this.api.updateSlider(id, payload));
        this.toast.success('Slider updated.');
      }
      this.editingSliderId.set(null);
      this.slidersRes.reload();
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.savingSlider.set(false);
    }
  }

  async moveSlider(id: number, direction: 'up' | 'down'): Promise<void> {
    this.movingSliderId.set(id);
    try {
      await firstValueFrom(this.api.moveSlider(id, direction));
      this.slidersRes.reload();
    } finally {
      this.movingSliderId.set(null);
    }
  }

  async toggleSliderStatus(s: AdminSlider): Promise<void> {
    await firstValueFrom(
      this.api.updateSlider(s.id, { status: s.status === 'active' ? 'inactive' : 'active' }),
    );
    this.slidersRes.reload();
  }

  async removeSlider(s: AdminSlider): Promise<void> {
    if (!(await this.confirmSvc.confirm({ message: 'Delete this slider?', danger: true }))) return;
    await firstValueFrom(this.api.removeSlider(s.id));
    this.toast.success('Slider deleted.');
    this.slidersRes.reload();
  }

  // ---------- advertisements ----------
  protected readonly adsRes = rxResource({ stream: () => this.api.ads() });
  protected readonly adsLoading = () => this.adsRes.isLoading();
  protected readonly ads = () => this.adsRes.value() ?? [];

  protected readonly editingAdId = signal<number | 'new' | null>(null);
  protected readonly savingAd = signal(false);

  protected readonly adForm = this.fb.nonNullable.group({
    title: [''],
    description: [''],
    mediaUrl: ['', [Validators.required]],
    ctaText: [''],
    ctaLink: [''],
    position: ['homepage_banner' as AdPayload['position']],
    startAt: [''],
    endAt: [''],
    status: ['active' as 'active' | 'inactive'],
  });

  startAddAd(): void {
    this.adForm.reset({ position: 'homepage_banner', status: 'active' });
    this.editingAdId.set('new');
  }
  startEditAd(a: AdminAd): void {
    this.adForm.reset({
      title: a.title ?? '',
      description: a.description ?? '',
      mediaUrl: a.mediaUrl,
      ctaText: a.ctaText ?? '',
      ctaLink: a.ctaLink ?? '',
      position: a.position,
      startAt: a.startAt ? a.startAt.slice(0, 10) : '',
      endAt: a.endAt ? a.endAt.slice(0, 10) : '',
      status: a.status,
    });
    this.editingAdId.set(a.id);
  }
  cancelAd(): void {
    this.editingAdId.set(null);
  }

  async saveAd(): Promise<void> {
    if (this.adForm.invalid) {
      this.adForm.markAllAsTouched();
      return;
    }
    const v = this.adForm.getRawValue();
    const payload: AdPayload = {
      title: v.title || undefined,
      description: v.description || undefined,
      mediaUrl: v.mediaUrl,
      ctaText: v.ctaText || undefined,
      ctaLink: v.ctaLink || undefined,
      position: v.position,
      startAt: v.startAt || undefined,
      endAt: v.endAt || undefined,
      status: v.status,
    };
    this.savingAd.set(true);
    try {
      const id = this.editingAdId();
      if (id === 'new') {
        await firstValueFrom(this.api.createAd(payload));
        this.toast.success('Advertisement created.');
      } else if (typeof id === 'number') {
        await firstValueFrom(this.api.updateAd(id, payload));
        this.toast.success('Advertisement updated.');
      }
      this.editingAdId.set(null);
      this.adsRes.reload();
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.savingAd.set(false);
    }
  }

  async toggleAdStatus(a: AdminAd): Promise<void> {
    await firstValueFrom(this.api.updateAd(a.id, { status: a.status === 'active' ? 'inactive' : 'active' }));
    this.adsRes.reload();
  }

  async removeAd(a: AdminAd): Promise<void> {
    if (!(await this.confirmSvc.confirm({ message: 'Delete this advertisement?', danger: true }))) return;
    await firstValueFrom(this.api.removeAd(a.id));
    this.toast.success('Advertisement deleted.');
    this.adsRes.reload();
  }

  // ---------- social links ----------
  protected readonly socialRes = rxResource({ stream: () => this.api.socialLinks() });
  protected readonly socialLoading = () => this.socialRes.isLoading();
  protected readonly socialLinks = () => this.socialRes.value() ?? [];

  protected readonly editingSocialId = signal<number | 'new' | null>(null);
  protected readonly savingSocial = signal(false);
  protected readonly movingSocialId = signal<number | null>(null);

  protected readonly socialForm = this.fb.nonNullable.group({
    platform: ['', [Validators.required]],
    url: ['', [Validators.required]],
    status: ['active' as 'active' | 'inactive'],
  });

  startAddSocial(): void {
    this.socialForm.reset({ platform: '', url: '', status: 'active' });
    this.editingSocialId.set('new');
  }
  startEditSocial(s: AdminSocialLink): void {
    this.socialForm.reset({ platform: s.platform, url: s.url, status: s.status });
    this.editingSocialId.set(s.id);
  }
  cancelSocial(): void {
    this.editingSocialId.set(null);
  }

  async saveSocial(): Promise<void> {
    if (this.socialForm.invalid) {
      this.socialForm.markAllAsTouched();
      return;
    }
    const payload: SocialLinkPayload = this.socialForm.getRawValue();
    this.savingSocial.set(true);
    try {
      const id = this.editingSocialId();
      if (id === 'new') {
        await firstValueFrom(this.api.createSocialLink(payload));
        this.toast.success('Social link created.');
      } else if (typeof id === 'number') {
        await firstValueFrom(this.api.updateSocialLink(id, payload));
        this.toast.success('Social link updated.');
      }
      this.editingSocialId.set(null);
      this.socialRes.reload();
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.savingSocial.set(false);
    }
  }

  async moveSocial(id: number, direction: 'up' | 'down'): Promise<void> {
    this.movingSocialId.set(id);
    try {
      await firstValueFrom(this.api.moveSocialLink(id, direction));
      this.socialRes.reload();
    } finally {
      this.movingSocialId.set(null);
    }
  }

  async toggleSocialStatus(s: AdminSocialLink): Promise<void> {
    await firstValueFrom(
      this.api.updateSocialLink(s.id, { status: s.status === 'active' ? 'inactive' : 'active' }),
    );
    this.socialRes.reload();
  }

  async removeSocial(s: AdminSocialLink): Promise<void> {
    if (!(await this.confirmSvc.confirm({ message: `Delete the ${s.platform} link?`, danger: true }))) return;
    await firstValueFrom(this.api.removeSocialLink(s.id));
    this.toast.success('Social link deleted.');
    this.socialRes.reload();
  }
}
