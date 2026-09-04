import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Address } from '../../../core/models';
import { AddressService } from '../../../core/services/address.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiEmptyState } from '../../../shared/components/ui-empty-state/ui-empty-state';

@Component({
  selector: 'app-addresses',
  standalone: true,
  imports: [ReactiveFormsModule, UiEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './addresses.html',
  styleUrl: './addresses.scss',
})
export class Addresses {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  protected readonly addresses = inject(AddressService);

  protected readonly editingId = signal<number | 'new' | null>(null);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+()\-\s]{7,20}$/)]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    city: ['', [Validators.required, Validators.minLength(2)]],
    area: [''],
    postalCode: [''],
    isDefault: [false],
  });

  constructor() {
    void this.addresses.load();
  }

  startAdd(): void {
    this.form.reset({ isDefault: this.addresses.addresses().length === 0 });
    this.editingId.set('new');
  }

  startEdit(a: Address): void {
    this.form.reset({
      name: a.name,
      phone: a.phone,
      address: a.address,
      city: a.city,
      area: a.area ?? '',
      postalCode: a.postalCode ?? '',
      isDefault: a.isDefault ?? false,
    });
    this.editingId.set(a.id);
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
    const payload = {
      name: v.name,
      phone: v.phone,
      address: v.address,
      city: v.city,
      area: v.area || undefined,
      postalCode: v.postalCode || undefined,
      isDefault: v.isDefault,
    };
    this.saving.set(true);
    try {
      const id = this.editingId();
      if (id === 'new') {
        await this.addresses.create(payload);
        this.toast.success('Address added.');
      } else if (typeof id === 'number') {
        await this.addresses.update(id, payload);
        this.toast.success('Address updated.');
      }
      this.editingId.set(null);
    } catch {
      /* interceptor surfaced it */
    } finally {
      this.saving.set(false);
    }
  }

  async makeDefault(a: Address): Promise<void> {
    await this.addresses.update(a.id, {
      name: a.name,
      phone: a.phone,
      address: a.address,
      city: a.city,
      area: a.area ?? undefined,
      postalCode: a.postalCode ?? undefined,
      isDefault: true,
    });
    this.toast.success('Default address updated.');
  }

  async remove(a: Address): Promise<void> {
    await this.addresses.remove(a.id);
    this.toast.info('Address removed.');
  }
}
