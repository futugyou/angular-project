import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { IOrderRow, IOrderRowDetail, IOrderSearch } from './order.model';

@Component({
    selector: 'app-order-main',
    templateUrl: './order.html',
    styleUrls: ['./order.css'],
    imports: [MatTableModule],
})
export class OrderMainComponent implements OnInit {
    @Input() totalCount = 0;
    @Input() pageIndex = 1;
    @Output() pageChange = new EventEmitter<number>();
    @Output() refresh = new EventEmitter<void>();

    form!: FormGroup;
    open = false;
    title = '';
    orderId = '';
    fdata: any = {};
    payData: any[] = [];
    tableData: IOrderRowDetail[] = [];
    data: IOrderRow[] = [
        {
            "id": "1",
            "orderCode": "ORD20250930001",
            "orderUser": "Alice",
            "orderTime": "2025-09-30T10:15:00Z",
            "orderTel": "13800000001",
            "orderPrice": 120.5,
            "remark": "First order",
            "payName": "WeChat",
            "payClient": "Mobile",
            "status": 1
        },
        {
            "id": "2",
            "orderCode": "ORD20250930002",
            "orderUser": "Bob",
            "orderTime": "2025-09-30T11:20:00Z",
            "orderTel": "13800000002",
            "orderPrice": 250.0,
            "remark": "Urgent delivery",
            "payName": "Alipay",
            "payClient": "App",
            "status": 2
        },
        {
            "id": "3",
            "orderCode": "ORD20250930003",
            "orderUser": "Charlie",
            "orderTime": "2025-09-30T12:00:00Z",
            "orderTel": "13800000003",
            "orderPrice": 75.3,
            "remark": "",
            "payName": "Credit Card",
            "payClient": "Web",
            "status": 1
        },
        {
            "id": "4",
            "orderCode": "ORD20250930004",
            "orderUser": "David",
            "orderTime": "2025-09-30T12:30:00Z",
            "orderTel": "13800000004",
            "orderPrice": 300.0,
            "remark": "Gift wrap",
            "payName": "WeChat",
            "payClient": "Mobile",
            "status": 3
        },
        {
            "id": "5",
            "orderCode": "ORD20250930005",
            "orderUser": "Eva",
            "orderTime": "2025-09-30T13:10:00Z",
            "orderTel": "13800000005",
            "orderPrice": 180.0,
            "remark": "",
            "payName": "Alipay",
            "payClient": "App",
            "status": 2
        },
        {
            "id": "6",
            "orderCode": "ORD20250930006",
            "orderUser": "Frank",
            "orderTime": "2025-09-30T14:00:00Z",
            "orderTel": "13800000006",
            "orderPrice": 99.9,
            "remark": "Include invoice",
            "payName": "Credit Card",
            "payClient": "Web",
            "status": 1
        },
        {
            "id": "7",
            "orderCode": "ORD20250930007",
            "orderUser": "Grace",
            "orderTime": "2025-09-30T14:45:00Z",
            "orderTel": "13800000007",
            "orderPrice": 220.0,
            "remark": "",
            "payName": "WeChat",
            "payClient": "Mobile",
            "status": 3
        },
        {
            "id": "8",
            "orderCode": "ORD20250930008",
            "orderUser": "Henry",
            "orderTime": "2025-09-30T15:20:00Z",
            "orderTel": "13800000008",
            "orderPrice": 150.0,
            "remark": "Rush order",
            "payName": "Alipay",
            "payClient": "App",
            "status": 2
        },
        {
            "id": "9",
            "orderCode": "ORD20250930009",
            "orderUser": "Ivy",
            "orderTime": "2025-09-30T16:00:00Z",
            "orderTel": "13800000009",
            "orderPrice": 60.0,
            "remark": "",
            "payName": "Credit Card",
            "payClient": "Web",
            "status": 1
        },
        {
            "id": "10",
            "orderCode": "ORD20250930010",
            "orderUser": "Jack",
            "orderTime": "2025-09-30T16:30:00Z",
            "orderTel": "13800000010",
            "orderPrice": 500.0,
            "remark": "VIP customer",
            "payName": "WeChat",
            "payClient": "Mobile",
            "status": 3
        }
    ]
        ;
    displayedColumns: string[] = ['id', 'orderCode', 'orderUser', 'orderTime', 'orderTel', 'orderPrice', 'remark', 'payName', 'payClient', 'status'];
    childPrint = false;

    constructor(
        private fb: FormBuilder,
    ) { }

    ngOnInit(): void {

        this.loadPays();
    }

    async loadPays() {

    }

    async loadOrderInfo() {

    }

    setFormData(data: any) {
        this.form.patchValue({
            orderCode: data.orderCode,
            orderTime: data.orderTime,
            orderUser: data.orderUser,
            payName: data.payName,
            orderTel: data.orderTel,
            orderAll: data.orderPrice,
            orderClient: data.payClient,
            remark: data.remark
        });
    }

    handlerView(row: IOrderRow) {
        this.orderId = row.id;
        this.title = 'View Order - ' + row.orderCode;
        this.open = true;
        this.loadOrderInfo();
    }

    handlerPrint(row: IOrderRow) {
        this.childPrint = true;
        this.orderId = row.id;
    }

    handlerClose() {
        this.orderId = '';
        this.form.reset();
        this.open = false;
    }

    onPageChange(page: number) {
        this.pageChange.emit(page);
    }

    async onPayConfirm(status: number) {
        const payName = this.form.value.payName;
        if (!payName && status === 1) {
            return;
        }
    }
}
