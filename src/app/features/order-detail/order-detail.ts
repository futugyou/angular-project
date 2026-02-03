import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { IOrderRowDetail } from './model';
import { NgIconsModule } from '@ng-icons/core'
import { lucideChevronLeft, lucideChevronRight } from '@ng-icons/lucide'
import { provideIcons } from '@ng-icons/core'

export const ORDER_DETAILS: IOrderRowDetail[] = [
  {
    index: 1,
    productName: 'Apple',
    productCode: 'A1001',
    count: 2,
    unitName: 'Jin',
    price: 5,
    remark: 'Fresh',
    allPrice: 10
  },
  {
    index: 2,
    productName: 'Banana',
    productCode: 'B2002',
    count: 3,
    unitName: 'Jin',
    price: 4,
    remark: '',
    allPrice: 12
  },
  {
    index: 3,
    productName: 'Milk',
    productCode: 'C3003',
    count: 1,
    unitName: 'Bottle',
    price: 8,
    remark: 'Whole Fat',
    allPrice: 8
  },
  {
    index: 4,
    productName: 'Bread',
    productCode: 'D4004',
    count: 5,
    unitName: 'piece',
    price: 3,
    remark: 'Toasted',
    allPrice: 15
  },
  {
    index: 5,
    productName: 'Egg',
    productCode: 'E5005',
    count: 12,
    unitName: 'piece',
    price: 1,
    remark: '',
    allPrice: 12
  }
];

@Component({
  selector: 'app-order-detail',
  standalone: true,
  templateUrl: './order-detail.html',
  styleUrls: ['./order-detail.css'],
  imports: [CommonModule, NgIconsModule],
  providers: [
    provideIcons({ lucideChevronLeft, lucideChevronRight })
  ],
})
export class OrderDetailComponent implements OnInit {
  order = inject(DIALOG_DATA);
  dialogRef = inject(DialogRef);

  orderDetails: IOrderRowDetail[] = [];

  ngOnInit(): void {
    this.orderDetails = ORDER_DETAILS;
  }

  close() {
    this.dialogRef.close();
  }
}