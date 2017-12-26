"use strict";
var a = 4,d=123,f='aaa';
var b = 2;
var sum =a/b+d;
console.log(sum);
//if
if (sum > 10) {
    alert('large');
} else if(sum<-2) {
    console.log('asdasd');
} else {
    alert('asdasd')
}
//for循环
for (var i=0; i< 100; i++ ) {
    console.log(i);
}
// switch
switch (sum) {
    case 1:
        console.log('1111');
        break;
    case 2:
        console.log('222222222222');
        break;
    default:
        console.log('nonononono');
        break;
}
//while
while (sum > 10) {
    alert('yesyes');
}
//do-while
do{
    alert('do-while');
}while(sum > 100);

function reduce(first, second) {
    return (first - second);
}

reduce(20, 10);
console.log(reduce);