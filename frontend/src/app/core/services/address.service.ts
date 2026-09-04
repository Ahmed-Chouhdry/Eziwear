import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Address } from '../models';
import { ApiService } from './api.service';

export interface AddressInput {
  name: string;
  phone: string;
  address: string;
  city: string;
  area?: string;
  postalCode?: string;
  isDefault?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly api = inject(ApiService);

  private readonly _addresses = signal<Address[]>([]);
  private readonly _loaded = signal(false);

  readonly addresses = this._addresses.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly defaultAddress = computed(
    () => this._addresses().find((a) => a.isDefault) ?? this._addresses()[0] ?? null,
  );

  async load(force = false): Promise<void> {
    if (this._loaded() && !force) return;
    const list = await firstValueFrom(this.api.get<Address[]>('addresses'));
    this._addresses.set(list);
    this._loaded.set(true);
  }

  async create(input: AddressInput): Promise<Address> {
    const created = await firstValueFrom(this.api.post<Address>('addresses', input));
    await this.load(true);
    return created;
  }

  async update(id: number, input: AddressInput): Promise<void> {
    await firstValueFrom(this.api.patch<Address>(`addresses/${id}`, input));
    await this.load(true);
  }

  async remove(id: number): Promise<void> {
    await firstValueFrom(this.api.delete<void>(`addresses/${id}`));
    await this.load(true);
  }
}
