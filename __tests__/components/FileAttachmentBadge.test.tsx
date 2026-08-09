import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { FileAttachmentBadge } from '../../src/components/ui/FileAttachmentBadge';
import { renderWithProviders } from '../helpers/render';

describe('FileAttachmentBadge component', () => {
  it('returns null when no fileName and not loading', async () => {
    const screen = await renderWithProviders(<FileAttachmentBadge />);
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('renders attached file name and document icon', async () => {
    const screen = await renderWithProviders(
      <FileAttachmentBadge fileName="my_resume.pdf" onRemove={() => {}} />
    );
    expect(screen.getByText('my_resume.pdf')).toBeTruthy();
  });

  it('calls onRemove when the clear button is pressed', async () => {
    const onRemoveMock = jest.fn();
    const screen = await renderWithProviders(
      <FileAttachmentBadge fileName="job_description.docx" onRemove={onRemoveMock} />
    );
    
    const removeBtn = screen.getByLabelText('Remove file attachment');
    fireEvent.press(removeBtn);
    expect(onRemoveMock).toHaveBeenCalledTimes(1);
  });

  it('renders loading state text when isLoading is true', async () => {
    const screen = await renderWithProviders(
      <FileAttachmentBadge isLoading={true} loadingText="Uploading..." />
    );
    expect(screen.getByText('Uploading...')).toBeTruthy();
  });
});
