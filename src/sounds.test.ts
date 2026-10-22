import { describe, expect, it, vi } from 'vitest';
import { loopDeadlineAlarm, TaskSounds } from './sounds';

function fakeAudio(){
 const oscillators:any[]=[];
 const context:any={state:'suspended',currentTime:10,destination:{},
  resume:vi.fn(async()=>{context.state='running';}),
  close:vi.fn(async()=>{context.state='closed';}),
  createOscillator:vi.fn(()=>{const oscillator={type:'sine',frequency:{setValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn(),start:vi.fn(),stop:vi.fn(),onended:null};oscillators.push(oscillator);return oscillator;}),
  createGain:vi.fn(()=>({gain:{setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}))};
 return {context,oscillators,player:new TaskSounds(()=>context as AudioContext)};
}
describe('task sound behavior',()=>{
 it('stays silent before enabling and while muted or at zero volume',async()=>{const {player,context}=fakeAudio();expect(player.play('completion')).toBe(false);expect(context.createOscillator).not.toHaveBeenCalled();await player.enable();player.mute();expect(player.play('deadline')).toBe(false);await player.enable();player.setVolume(0);expect(player.play('completion')).toBe(false);expect(context.createOscillator).not.toHaveBeenCalled();});
 it('plays a distinct completion melody and deadline pattern',async()=>{const {player,oscillators}=fakeAudio();await player.enable();expect(player.play('completion')).toBe(true);expect(oscillators.map(o=>o.frequency.setValueAtTime.mock.calls[0][0])).toEqual([523.25,659.25,783.99,1046.5]);oscillators.length=0;player.play('deadline');expect(oscillators.map(o=>o.frequency.setValueAtTime.mock.calls[0][0])).toEqual([660,880,660]);});
 it('cancels queued deadline notes before playing completion',async()=>{const {player,oscillators}=fakeAudio();await player.enable();player.play('deadline');const alarms=[...oscillators];player.play('completion');for(const alarm of alarms){expect(alarm.stop).toHaveBeenLastCalledWith();expect(alarm.disconnect).toHaveBeenCalled();}const success=oscillators.slice(3);player.stop('deadline');for(const voice of success)expect(voice.disconnect).not.toHaveBeenCalled();});
 it('resumes suspended audio on a completion click but respects a later mute',async()=>{const {player,context,oscillators}=fakeAudio();await player.enable();context.state='suspended';expect(await player.playFromGesture('completion')).toBe(true);context.state='suspended';const pending=player.playFromGesture('completion');player.mute();expect(await pending).toBe(false);expect(oscillators).toHaveLength(4);});
 it('handles unavailable audio and cleans up playing notes',async()=>{const unavailable=new TaskSounds(()=>{throw Error('No audio device');});await expect(unavailable.enable()).rejects.toThrow('No audio device');expect(unavailable.play('completion')).toBe(false);const {player,context,oscillators}=fakeAudio();await player.enable();player.play('completion');player.destroy();expect(context.close).toHaveBeenCalledOnce();for(const voice of oscillators)expect(voice.disconnect).toHaveBeenCalled();expect(player.play('deadline')).toBe(false);});
 it('uses a stronger deadline tone while honoring the volume slider',async()=>{const {player,context,oscillators}=fakeAudio();await player.enable();player.play('deadline');expect(oscillators[0].type).toBe('triangle');expect(context.createGain.mock.results[0].value.gain.linearRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(.36);player.setVolume(.2);player.play('deadline');expect(context.createGain.mock.results[3].value.gain.linearRampToValueAtTime.mock.calls[0][0]).toBeCloseTo(.09);});
 it('keeps repeating beyond the old one-minute limit and stops completely on dismissal',()=>{vi.useFakeTimers();try{const player={play:vi.fn(),stop:vi.fn()};const dismiss=loopDeadlineAlarm(player);expect(player.play).toHaveBeenCalledExactlyOnceWith('deadline');vi.advanceTimersByTime(125000);expect(player.play).toHaveBeenCalledTimes(79);dismiss();expect(player.stop).toHaveBeenCalledExactlyOnceWith('deadline');vi.advanceTimersByTime(125000);expect(player.play).toHaveBeenCalledTimes(79);expect(vi.getTimerCount()).toBe(0);}finally{vi.useRealTimers();}});
});
