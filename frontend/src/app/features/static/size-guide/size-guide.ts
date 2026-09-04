import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface SizeRow {
  size: string;
  chest: string;
  length: string;
  shoulder: string;
  sleeve: string;
  waist: string;
  pantLength: string;
}

@Component({
  selector: 'app-size-guide',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './size-guide.html',
  styleUrl: './size-guide.scss',
})
export class SizeGuide {
  protected readonly rows: SizeRow[] = [
    { size: 'S', chest: '38"', length: '26"', shoulder: '17"', sleeve: '8"', waist: '28–30"', pantLength: '39"' },
    { size: 'M', chest: '40"', length: '27"', shoulder: '18"', sleeve: '8.5"', waist: '30–32"', pantLength: '40"' },
    { size: 'L', chest: '42"', length: '28"', shoulder: '19"', sleeve: '9"', waist: '32–34"', pantLength: '41"' },
    { size: 'XL', chest: '44"', length: '29"', shoulder: '20"', sleeve: '9.5"', waist: '34–36"', pantLength: '42"' },
    { size: '2XL', chest: '46"', length: '30"', shoulder: '21"', sleeve: '10"', waist: '36–38"', pantLength: '43"' },
    { size: '3XL', chest: '48"', length: '31"', shoulder: '22"', sleeve: '10.5"', waist: '38–40"', pantLength: '44"' },
    { size: '4XL', chest: '50"', length: '32"', shoulder: '23"', sleeve: '11"', waist: '40–42"', pantLength: '45"' },
  ];

  protected readonly tips = [
    'Use a soft measuring tape.',
    'Chest: measure 1 inch below the armhole, garment laid flat.',
    'Waist: measure the top edge of the waistband, relaxed.',
    'Length: measure from the highest point of the shoulder straight down.',
    'Allow 0.5–1 inch of tolerance — every piece is finished by hand.',
  ];
}
