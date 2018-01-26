const arr = [ 'i\\\\j' ]


let str = ''

arr.forEach((token) => {
  str += token
  console.log(token)
})


console.log(str.length)


