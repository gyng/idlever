import config from '/home/g/p/riddle/web/vite.config.ts';
export default {...config,root:'/home/g/p/riddle/web',server:{...config.server,host:'127.0.0.1',port:5212,strictPort:true,hmr:false,watch:null}};
