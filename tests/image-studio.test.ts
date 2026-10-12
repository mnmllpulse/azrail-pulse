import {describe,expect,it} from 'vitest';
import {detectImage,effectiveImagePrompt,imageDimensions,parseImageStudioRequest,selectImageModel,runImageProvider} from '../src/lib/image-studio';
import {imageOperationProviderSupport} from '../src/lib/image-intelligence';

describe('Professional Image Studio contract',()=>{
 it('parses bounded controls and computes aspect-ratio dimensions',()=>{
  const input=parseImageStudioRequest({prompt:'Dark sculpture',aspectRatio:'16:9',resolution:1024,style:'dark-techno',seed:77,variations:4});
  expect(input).toMatchObject({aspectRatio:'16:9',resolution:1024,style:'dark-techno',seed:77,variations:4,operation:'generate'});
  expect(imageDimensions('16:9',1024)).toEqual({width:1024,height:576});
  expect(imageDimensions('9:16',768)).toEqual({width:432,height:768});
 });
 it('keeps model choice system-owned and selects reference-capable quality models',()=>{
  const fast=parseImageStudioRequest({prompt:'A',resolution:512});
  const high=parseImageStudioRequest({prompt:'A',resolution:1024});
  const edit=parseImageStudioRequest({prompt:'A',resolution:512,operation:'edit',referenceArtifactId:'123e4567-e89b-12d3-a456-426614174000'});
  expect(selectImageModel(fast)).toContain('flux-2-klein-4b');
  expect(selectImageModel(high)).toContain('flux-2-klein-9b');
  expect(selectImageModel(edit)).toContain('flux-2-klein-9b');
  expect(fast).not.toHaveProperty('model');
 });
 it('requires a reference for edit modes and bounds variations/seed',()=>{
  expect(()=>parseImageStudioRequest({prompt:'A',operation:'variation'})).toThrow('reference');
  expect(()=>parseImageStudioRequest({prompt:'A',variations:5})).toThrow('1 до 4');
  expect(()=>parseImageStudioRequest({prompt:'A',seed:-1})).toThrow('Seed');
 });

 it('supports reviewed manual image model selection while keeping AUTO as default',()=>{
  const auto=parseImageStudioRequest({prompt:'A',resolution:512});
  const manual=parseImageStudioRequest({prompt:'A',resolution:512,requestedModel:'@cf/black-forest-labs/flux-2-klein-9b'});
  expect(auto.requestedModel).toBeNull();expect(selectImageModel(manual)).toBe('@cf/black-forest-labs/flux-2-klein-9b');
  expect(()=>parseImageStudioRequest({prompt:'A',requestedModel:'openai/not-reviewed'})).toThrow('не разрешена');
 });
 it('fails closed for region operations until a reviewed mask-capable provider is wired',()=>{
  const support=imageOperationProviderSupport('inpaint');expect(support.ready).toBe(false);expect(support.code).toBe('MASK_PROVIDER_REQUIRED');
  expect(()=>parseImageStudioRequest({prompt:'remove',operation:'remove',referenceArtifactId:'123e4567-e89b-12d3-a456-426614174000'})).toThrow('mask');
  expect(()=>parseImageStudioRequest({prompt:'UI card',structuralMode:true})).not.toThrow();
 });

 it('builds a controlled variation prompt and detects supported media signatures',()=>{
  const input=parseImageStudioRequest({prompt:'Cover',operation:'variation',referenceArtifactId:'123e4567-e89b-12d3-a456-426614174000',variations:2,style:'minimal'});
  expect(effectiveImagePrompt(input,1)).toContain('Variation 2 of 2');
  const png=new Uint8Array(33);[137,80,78,71,13,10,26,10].forEach((v,i)=>png[i]=v);
  expect(detectImage(png)).toEqual({mime:'image/png',extension:'png'});
 });
});
