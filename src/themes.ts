export const themes=[
 {id:'cinematic',name:'Original cinematic',subtitle:'Your familiar starlit lakeside video',image:'cinematic.jpg',video:'background.mp4',surface:'7 23 32',accent:'#d1d8dc',fallback:'#002b42',dim:0,kind:'video'},
 {id:'morning',name:'Golden Morning',subtitle:'Writing at a sunlit lakeside table',image:'morning.jpg',video:'morning.mp4',surface:'31 36 37',accent:'#f5dfb9',fallback:'#493e32',dim:.3,kind:'video'},
 {id:'winter',name:'Winter Retreat',subtitle:'Reading beneath a snowy chalet veranda',image:'winter.jpg',video:'winter.mp4',surface:'12 29 43',accent:'#c4deee',fallback:'#163348',dim:.2,kind:'video'},
 {id:'spring',name:'Spring Garden',subtitle:'Sketching among soft spring blossoms',image:'spring.jpg',video:'spring.mp4',surface:'18 37 34',accent:'#e4d5e3',fallback:'#294c43',dim:.3,kind:'video'},
 {id:'autumn',name:'Autumn Library',subtitle:'A quiet book in a warm autumn library',image:'autumn.jpg',video:'autumn.mp4',surface:'35 27 24',accent:'#f0d0a8',fallback:'#463529',dim:.2,kind:'video'},
 {id:'rain',name:'Rainy Evening',subtitle:'Writing at a desk on a rainy evening',image:'rain.jpg',video:'rain.mp4',surface:'18 25 40',accent:'#ced5ef',fallback:'#202d45',dim:.1,kind:'video'},
] as const;
export type ThemeId=typeof themes[number]['id'];
export function getTheme(id:unknown){return themes.find(theme=>theme.id===id)??themes[0];}
export function backgroundDim(value:unknown,fallback=0){return typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(.6,value)):fallback;}
export const themeImage=(image:string)=>`${import.meta.env.BASE_URL}themes/${image}`;
export const themeVideo=(video:string)=>`${import.meta.env.BASE_URL}videos/${video}`;
