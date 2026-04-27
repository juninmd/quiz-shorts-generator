import { describe, it, expect, vi } from 'vitest';
import { execAsync } from '../utils/exec.js';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

describe('execAsync', () => {
  it('deve resolver com sucesso quando o processo fecha com código 0', async () => {
    const mockChild: any = new EventEmitter();
    mockChild.stdout = new EventEmitter();
    mockChild.stderr = new EventEmitter();
    
    (spawn as any).mockReturnValue(mockChild);

    const promise = execAsync('test-cmd', ['arg1']);

    mockChild.stdout.emit('data', Buffer.from('saida padrão'));
    mockChild.stderr.emit('data', Buffer.from('erro padrão'));
    mockChild.emit('close', 0);

    const result = await promise;

    expect(result).toEqual({
      stdout: 'saida padrão',
      stderr: 'erro padrão',
      code: 0
    });
    expect(spawn).toHaveBeenCalledWith('test-cmd', ['arg1'], {});
  });

  it('deve rejeitar se houver erro ao iniciar o processo', async () => {
    const mockChild: any = new EventEmitter();
    (spawn as any).mockReturnValue(mockChild);

    const promise = execAsync('invalid-cmd', []);

    const error = new Error('Spawn failed');
    mockChild.emit('error', error);

    await expect(promise).rejects.toThrow('Spawn failed');
  });

  it('deve lidar com ausência de stdout/stderr', async () => {
    const mockChild: any = new EventEmitter();
    mockChild.stdout = null;
    mockChild.stderr = null;
    
    (spawn as any).mockReturnValue(mockChild);

    const promise = execAsync('test-cmd', []);
    mockChild.emit('close', 1);

    const result = await promise;
    expect(result).toEqual({
      stdout: '',
      stderr: '',
      code: 1
    });
  });
});
