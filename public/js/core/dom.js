/* DOM handles shared by every layer. */


export const $=s=>document.querySelector(s);
export const cv=$('#c');
export const ctx=cv.getContext('2d');
