import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms'
import { Dialog, DialogModule } from '@angular/cdk/dialog'
import { IOrderRow, IOrderRowDetail } from './order.model'
import { OrderDetailComponent } from '../order-detail/order-detail'
import { NgIconsModule } from '@ng-icons/core'

const ORDER_DATA: IOrderRow[] = [
  {
    id: '1',
    orderCode: 'ORD20250930001',
    orderUser: 'Alice',
    orderTime: '2025-09-30T10:15:00Z',
    orderTel: '13800000001',
    orderPrice: 120.5,
    remark: 'First order',
    payName: 'WeChat',
    payClient: 'Mobile',
    status: 1,
  },
  {
    id: '2',
    orderCode: 'ORD20250930002',
    orderUser: 'Bob',
    orderTime: '2025-09-30T11:20:00Z',
    orderTel: '13800000002',
    orderPrice: 250.0,
    remark: 'Urgent delivery',
    payName: 'Alipay',
    payClient: 'App',
    status: 2,
  },
  {
    id: '3',
    orderCode: 'ORD20250930003',
    orderUser: 'Charlie',
    orderTime: '2025-09-30T12:00:00Z',
    orderTel: '13800000003',
    orderPrice: 75.3,
    remark: '',
    payName: 'Credit Card',
    payClient: 'Web',
    status: 1,
  },
  {
    id: '4',
    orderCode: 'ORD20250930004',
    orderUser: 'David',
    orderTime: '2025-09-30T12:30:00Z',
    orderTel: '13800000004',
    orderPrice: 300.0,
    remark: 'Gift wrap',
    payName: 'WeChat',
    payClient: 'Mobile',
    status: 3,
  },
  {
    id: '5',
    orderCode: 'ORD20250930005',
    orderUser: 'Eva',
    orderTime: '2025-09-30T13:10:00Z',
    orderTel: '13800000005',
    orderPrice: 180.0,
    remark: '',
    payName: 'Alipay',
    payClient: 'App',
    status: 2,
  },
  {
    id: '6',
    orderCode: 'ORD20250930006',
    orderUser: 'Frank',
    orderTime: '2025-09-30T14:00:00Z',
    orderTel: '13800000006',
    orderPrice: 99.9,
    remark: 'Include invoice',
    payName: 'Credit Card',
    payClient: 'Web',
    status: 1,
  },
  {
    id: '7',
    orderCode: 'ORD20250930007',
    orderUser: 'Grace',
    orderTime: '2025-09-30T14:45:00Z',
    orderTel: '13800000007',
    orderPrice: 220.0,
    remark: '',
    payName: 'WeChat',
    payClient: 'Mobile',
    status: 3,
  },
  {
    id: '8',
    orderCode: 'ORD20250930008',
    orderUser: 'Henry',
    orderTime: '2025-09-30T15:20:00Z',
    orderTel: '13800000008',
    orderPrice: 150.0,
    remark: 'Rush order',
    payName: 'Alipay',
    payClient: 'App',
    status: 2,
  },
  {
    id: '9',
    orderCode: 'ORD20250930009',
    orderUser: 'Ivy',
    orderTime: '2025-09-30T16:00:00Z',
    orderTel: '13800000009',
    orderPrice: 60.0,
    remark: '',
    payName: 'Credit Card',
    payClient: 'Web',
    status: 1,
  },
  {
    id: '10',
    orderCode: 'ORD20250930010',
    orderUser: 'Jack',
    orderTime: '2025-09-30T16:30:00Z',
    orderTel: '13800000010',
    orderPrice: 500.0,
    remark: 'VIP customer',
    payName: 'WeChat',
    payClient: 'Mobile',
    status: 3,
  },
]

@Component({
  selector: 'app-order-main',
  standalone: true,
  templateUrl: './order.html',
  styleUrls: ['./order.css'],
  imports: [CommonModule, ReactiveFormsModule, DialogModule, NgIconsModule],
})
export class OrderMainComponent implements OnInit {
  private dialog = inject(Dialog)
  private fb = inject(FormBuilder)

  totalCount = signal(0)
  pageIndex = signal(0)
  pageSize = signal(5)

  @Output() pageChange = new EventEmitter<number>()

  data: IOrderRow[] = []
  form: FormGroup

  constructor() {
    this.form = this.fb.group({
      orderCode: [''],
      orderTime: [''],
      orderUser: [''],
      payName: [''],
      orderTel: [''],
      orderAll: [''],
      orderClient: [''],
      remark: [''],
    })
  }

  ngOnInit(): void {
    this.loadPays()
  }

  async loadPays() {
    this.totalCount.set(ORDER_DATA.length)
    const start = this.pageIndex() * this.pageSize()
    const end = start + this.pageSize()
    this.data = ORDER_DATA.slice(start, end)
  }

  handlerView(order: IOrderRow) {
    this.dialog.open(OrderDetailComponent, {
      data: order,
      panelClass: ['max-w-4xl', 'w-full', 'm-4'],
      backdropClass: 'bg-black/50',
    })
  }

  nextPage() {
    if ((this.pageIndex() + 1) * this.pageSize() < this.totalCount()) {
      this.pageIndex.update((v) => v + 1)
      this.loadPays()
    }
  }

  prevPage() {
    if (this.pageIndex() > 0) {
      this.pageIndex.update((v) => v - 1)
      this.loadPays()
    }
  }

  onPageSizeChange(newSize: string) {
    this.pageSize.set(parseInt(newSize, 10))
    this.pageIndex.set(0)
    this.loadPays()
  }

  handlerPrint(element: IOrderRow) {
    console.log('Printing order:', element.orderCode)
  }
}
