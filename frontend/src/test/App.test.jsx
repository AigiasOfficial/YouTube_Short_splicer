import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { vi } from 'vitest';

// Mock ReactPlayer since it relies on browser APIs not fully implemented in jsdom
// and we don't need to test the external library itself.
vi.mock('react-player', () => {
  return {
    default: vi.fn((props) => (
      <div data-testid="react-player">
        Mock Player
        <button onClick={() => props.onProgress && props.onProgress({ playedSeconds: 10 })}>
          Simulate Progress 10s
        </button>
        <button onClick={() => props.onDuration && props.onDuration(100)}>
          Simulate Duration 100s
        </button>
      </div>
    )),
  };
});

describe('App Component', () => {
  beforeEach(() => {
    // Reset mocks if needed
    vi.clearAllMocks();
    // Mock URL.createObjectURL since jsdom doesn't implement it
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  test('renders initial state correctly', () => {
    render(<App />);
    expect(screen.getByText(/Short Splicer/i)).toBeInTheDocument();
    expect(screen.getByText(/Load a video to start splicing/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Video File/i)).toBeInTheDocument();
    
    // Generate button should be disabled
    const generateBtn = screen.getByText(/Generate Short/i).closest('button');
    expect(generateBtn).toBeDisabled();
  });

  test('loads a video file', async () => {
    render(<App />);
    
    const file = new File(['dummy content'], 'test.mp4', { type: 'video/mp4' });
    const input = screen.getByLabelText(/Select Video File/i); // Using label text association
    
    // The input is hidden but associated with the label. 
    // We can target the input by ID if needed, but label text is better accessibility test.
    // However, the input has `display: none` (class="hidden").
    // FireEvent change on the input directly.
    const fileInput = document.getElementById('video-upload');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Should show player
    expect(await screen.findByTestId('react-player')).toBeInTheDocument();
    expect(screen.getByText('Change Video')).toBeInTheDocument();
  });

  test('handles scene marking', async () => {
    render(<App />);
    
    // Load Video
    const file = new File(['dummy content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = document.getElementById('video-upload');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await screen.findByTestId('react-player');

    // Simulate buttons
    const markInBtn = screen.getByText(/Mark In/i).closest('button');
    const markOutBtn = screen.getByText(/Mark Out/i).closest('button');
    
    // Initial state: Mark In enabled, Mark Out disabled
    expect(markInBtn).not.toBeDisabled();
    expect(markOutBtn).toBeDisabled();

    // Click Mark In
    fireEvent.click(markInBtn);
    
    // Now Mark In disabled, Mark Out enabled
    expect(markInBtn).toBeDisabled();
    expect(markOutBtn).not.toBeDisabled();
    
    // Simulate player progress to move time forward (start=0, end=10)
    // We mocked the player to have a button that simulates progress
    fireEvent.click(screen.getByText('Simulate Progress 10s'));
    
    // Click Mark Out
    fireEvent.click(markOutBtn);
    
    // Should see segment in list
    expect(await screen.findByText('Scene 1')).toBeInTheDocument();
    
    // Verify segment format (0:00 -> 0:10)
    // There are multiple 0:00 (one in the segment list, one in the player controls)
    const segmentList = await screen.findByText('Scene 1').then(el => el.closest('.space-y-2'));
    expect(segmentList).toHaveTextContent('0:00');
    expect(segmentList).toHaveTextContent('0:10');
    
    // Verify Generate button is now enabled
    const generateBtn = screen.getByText(/Generate Short/i).closest('button');
    expect(generateBtn).not.toBeDisabled();
  });

  test('can delete a segment', async () => {
    render(<App />);
    
    // Load Video & Add Segment
    const file = new File(['dummy content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = document.getElementById('video-upload');
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await screen.findByTestId('react-player');
    const markInBtn = screen.getByText(/Mark In/i).closest('button');
    const markOutBtn = screen.getByText(/Mark Out/i).closest('button');
    
    fireEvent.click(markInBtn);
    fireEvent.click(screen.getByText('Simulate Progress 10s'));
    fireEvent.click(markOutBtn);
    
    expect(screen.getByText('Scene 1')).toBeInTheDocument();
    
    // Find delete button (Trash icon)
    // We can find it by looking for the button in the segment row
    const deleteBtn = screen.getByText('Scene 1').closest('div').parentElement.querySelector('button');
    fireEvent.click(deleteBtn);
    
    // Segment should be gone
    expect(screen.queryByText('Scene 1')).not.toBeInTheDocument();
    
    // Generate button disabled again
    const generateBtn = screen.getByText(/Generate Short/i).closest('button');
    expect(generateBtn).toBeDisabled();
  });
});
