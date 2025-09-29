import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { IOrderRow, IOrderRowDetail, IOrderSearch } from './order.model';

@Component({
    selector: 'app-order-main',
    templateUrl: './order.html',
    styleUrls: ['./order.css']
})
export class OrderMainComponent implements OnInit {
    @Input() totalCount = 0;
    @Input() data: IOrderRow[] = [];
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
