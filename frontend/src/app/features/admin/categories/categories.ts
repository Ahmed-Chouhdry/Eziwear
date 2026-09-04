import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  AdminCategoryDto,
  AdminCategoryService,
  CategoryPayload,
} from '../../../core/services/admin-category.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiImageUpload } from '../../../shared/components/ui-image-upload/ui-image-upload';
import { UiSkeleton } from '../../../shared/components/ui-skeleton/ui-skeleton';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [ReactiveFormsModule, UiSkeleton, UiImageUpload],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirmSvc = inject(ConfirmService);
  private readonly api = inject(AdminCategoryService);

  protected readonly res = rxResource({ stream: () => this.api.list() });
  protected readonly loading = () => this.res.isLoading();
  protected readonly categories = () => this.res.value() ?? [];

  protected readonly editingId = signal<number | 'new' | null>(null);
  protected readonly saving = signal(false);
  protected readonly movingId = signal<number | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    image: [''],
    status: ['active' as 'active' | 'inactive'],
  });

  startAdd(): void {
    this.form.reset({ status: 'active' });
    this.editingId.set('new');
  }

  startEdit(c: AdminCategoryDto): void {
    this.form.reset({
      name: c.name,
      description: c.description ?? '',
      image: c.image ?? '',
      status: c.status,
    });
    this.editingId.set(c.id);
  }

  cancel(): void {
    this.editingId.set(null);
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: CategoryPayload = {
      name: v.name,
      description: v.description || undefined,
      image: v.image || undefined,
      status: v.status,
    };
    this.saving.set(true);
    try {
      const id = this.editingId();
      if (id === 'new') {
        await firstValueFrom(this.api.create(payload));
        this.toast.success('Category created.');
      } else if (typeof id === 'number') {
        await firstValueFrom(this.api.update(id, payload));
        this.toast.success('Category updated.');
      }
      this.editingId.set(null);
      this.res.reload();
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.saving.set(false);
    }
  }

  async move(id: number, direction: 'up' | 'down'): Promise<void> {
    this.movingId.set(id);
    try {
      await firstValueFrom(this.api.move(id, direction));
      this.res.reload();
    } finally {
      this.movingId.set(null);
    }
  }

  async toggleStatus(c: AdminCategoryDto): Promise<void> {
    await firstValueFrom(this.api.update(c.id, { status: c.status === 'active' ? 'inactive' : 'active' }));
    this.toast.success(c.status === 'active' ? 'Category disabled.' : 'Category enabled.');
    this.res.reload();
  }

  async remove(c: AdminCategoryDto): Promise<void> {
    if (c.productCount > 0) {
      this.toast.error(`Move or delete the ${c.productCount} product(s) in "${c.name}" first.`);
      return;
    }
    if (!(await this.confirmSvc.confirm({ message: `Delete category "${c.name}"?`, danger: true }))) return;
    try {
      await firstValueFrom(this.api.remove(c.id));
      this.toast.success('Category deleted.');
      this.res.reload();
    } catch {
      /* interceptor surfaced it */
    }
  }
}
