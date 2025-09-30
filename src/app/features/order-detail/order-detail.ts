import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { IOrderRowDetail } from './model';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';

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
  templateUrl: './order-detail.html',
  styleUrls: ['./order-detail.css'],
  imports: [MatTableModule, CommonModule],
})
export class OrderDetailComponent implements OnInit {
  order = inject(MAT_DIALOG_DATA);

  displayedColumns: string[] = ['index', 'productName', 'productCode', 'count', 'unitName', 'price', 'allPrice', 'remark'];
  orderDetails: IOrderRowDetail[] = [];

  constructor() { }

  ngOnInit(): void {
    console.log('Fetching order details is:', this.order);
    this.orderDetails = ORDER_DETAILS;
  }
}
