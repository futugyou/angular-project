import { ComponentFixture, TestBed } from '@angular/core/testing'
import { OrderDetailComponent } from './order-detail'
import { NgIconsModule } from '@ng-icons/core'
import { lucideClipboardList, lucideX } from '@ng-icons/lucide'
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog'

describe('OrderDetailComponent', () => {
  let component: OrderDetailComponent
  let fixture: ComponentFixture<OrderDetailComponent>

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderDetailComponent, NgIconsModule.withIcons({ lucideClipboardList, lucideX })],
      providers: [
        { provide: DIALOG_DATA, useValue: { id: 123, name: 'test order' } },
        {
          provide: DialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents()

    fixture = TestBed.createComponent(OrderDetailComponent)
    component = fixture.componentInstance
    fixture.detectChanges()
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })
})
