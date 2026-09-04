import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CreateOrderPayload } from '../../core/models';
import { AddressService } from '../../core/services/address.service';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { PricePipe } from '../../shared/pipes/price.pipe';
import { UiSpinner } from '../../shared/components/ui-spinner/ui-spinner';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PricePipe, UiSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  protected readonly cart = inject(CartService);
  protected readonly addresses = inject(AddressService);

  protected readonly loading = signal(true);
  protected readonly placing = signal(false);
  protected readonly selectedAddressId = signal<number | null>(null);
  protected readonly addingNew = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+()\-\s]{7,20}$/)]],
    address: ['', [Validators.required, Validators.minLength(5)]],
    city: ['', [Validators.required, Validators.minLength(2)]],
    area: [''],
    postalCode: [''],
    saveAddress: [true],
  });

  protected readonly notes = this.fb.control('');

  private readonly formStatus = toSignal(this.form.statusChanges, {
    initialValue: this.form.status,
  });

  protected readonly canPlace = computed(() => {
    if (this.cart.items().length === 0) return false;
    return this.addingNew()
      ? this.formStatus() === 'VALID'
      : this.selectedAddressId() != null;
  });

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    await this.cart.whenReady();
    if (this.cart.items().length === 0) {
      void this.router.navigate(['/cart']);
      return;
    }
    await Promise.all([this.addresses.load(), this.cart.revalidate()]);

    if (this.cart.items().length === 0) {
      void this.router.navigate(['/cart']);
      return;
    }

    const def = this.addresses.defaultAddress();
    if (def) {
      this.selectedAddressId.set(def.id);
    } else {
      this.addingNew.set(true);
    }
    this.loading.set(false);
  }

  selectAddress(id: number): void {
    this.selectedAddressId.set(id);
    this.addingNew.set(false);
  }

  startAddNew(): void {
    this.addingNew.set(true);
    this.selectedAddressId.set(null);
  }

  cancelAddNew(): void {
    this.addingNew.set(false);
    const def = this.addresses.defaultAddress();
    if (def) this.selectedAddressId.set(def.id);
  }

  async placeOrder(): Promise<void> {
    if (!this.canPlace() || this.placing()) return;

    const payload: CreateOrderPayload = {
      paymentMethod: 'cod',
      shippingMethod: 'standard',
      couponCode: this.cart.coupon()?.code,
      notes: this.notes.value?.trim() || undefined,
    };

    if (this.addingNew()) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
      const v = this.form.getRawValue();
      payload.address = {
        name: v.name,
        phone: v.phone,
        address: v.address,
        city: v.city,
        area: v.area || undefined,
        postalCode: v.postalCode || undefined,
        saveAddress: v.saveAddress,
      };
    } else {
      payload.addressId = this.selectedAddressId() as number;
    }

    this.placing.set(true);
    this.orders.create(payload).subscribe({
      next: (order) => {
        this.cart.clearAfterOrder();
        void this.router.navigate(['/order', order.orderNumber], { queryParams: { placed: 1 } });
      },
      error: () => {
        this.placing.set(false);
        void this.cart.revalidate();
      },
    });
  }
}
