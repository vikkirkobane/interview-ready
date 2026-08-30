import React from 'react';
import { PaystackWebViewComponent, PaystackPaymentData } from '../../src/components/features/payments/PaystackWebView.web';
import { renderWithProviders } from '../helpers/render';

describe('PaystackWebViewComponent on Web', () => {
  const mockPaymentData: PaystackPaymentData = {
    email: 'user@example.com',
    amount: 500000,
    reference: 'REF_TEST_123',
    publicKey: 'pk_test_123',
    currency: 'NGN',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders checkout loading indicator and text', async () => {
    const screen = await renderWithProviders(
      <PaystackWebViewComponent
        paymentData={mockPaymentData}
        onSuccess={jest.fn()}
        onCancel={jest.fn()}
        onError={jest.fn()}
      />
    );

    expect(screen.getByText('Opening secure Paystack checkout...')).toBeTruthy();
  });
});
