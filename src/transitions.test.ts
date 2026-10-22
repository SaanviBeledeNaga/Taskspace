import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('react-dom',()=>({flushSync:(update:()=>void)=>update()}));
function environment(reduced=false){
 const animation={cancel:vi.fn(),finished:new Promise<void>(()=>{})},animate=vi.fn(()=>animation);
 const document:any={querySelector:vi.fn(()=>({animate})),startViewTransition:vi.fn()};
 vi.stubGlobal('document',document);vi.stubGlobal('matchMedia',vi.fn(()=>({matches:reduced})));
 return {document,animate,animation};
}
beforeEach(()=>{vi.resetModules();vi.unstubAllGlobals();});
describe('live glass context transitions',()=>{
 it('commits immediately and animates the live region without a snapshot handoff',async()=>{const env=environment();const {switchContext}=await import('./transitions');const update=vi.fn();switchContext(update);expect(update).toHaveBeenCalledOnce();expect(env.animate).toHaveBeenCalledOnce();expect(env.document.startViewTransition).not.toHaveBeenCalled();});
 it('never fades or filters the glass ancestor during a switch',async()=>{const env=environment();const {switchContext}=await import('./transitions');switchContext(()=>{});const [frames,options]=(env.animate.mock.calls as unknown as [Keyframe[],KeyframeAnimationOptions][])[0];expect(frames).toEqual([{transform:'translateY(8px)'},{transform:'translateY(0)'}]);for(const frame of frames){expect(frame).not.toHaveProperty('opacity');expect(frame).not.toHaveProperty('filter');expect(frame).not.toHaveProperty('backdropFilter');}expect(options).not.toHaveProperty('fill');});
 it('keeps reduced-motion changes immediate and animation-free',async()=>{const env=environment(true);const {switchContext}=await import('./transitions');const update=vi.fn();switchContext(update);expect(update).toHaveBeenCalledOnce();expect(env.animate).not.toHaveBeenCalled();});
 it('cancels the previous movement while preserving rapid switches in order',async()=>{const env=environment();const {switchContext}=await import('./transitions');const changes:string[]=[];switchContext(()=>changes.push('completed'));switchContext(()=>changes.push('canvas'));expect(changes).toEqual(['completed','canvas']);expect(env.animation.cancel).toHaveBeenCalledOnce();expect(env.animate).toHaveBeenCalledTimes(2);});
 it('applies the change when the browser cannot animate',async()=>{const env=environment();env.animate.mockImplementation(()=>{throw Error('No animation surface');});const {switchContext}=await import('./transitions');const update=vi.fn();expect(()=>switchContext(update,'.report-body')).not.toThrow();expect(update).toHaveBeenCalledOnce();expect(env.document.querySelector).toHaveBeenCalledWith('.report-body');});
 it('does not defer state updates when the region is absent',async()=>{const env=environment();env.document.querySelector.mockReturnValue(null);const {switchContext}=await import('./transitions');const update=vi.fn();switchContext(update);expect(update).toHaveBeenCalledOnce();expect(env.animate).not.toHaveBeenCalled();});
});
