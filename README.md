# vscode-alias-path 
中文|[English](https://github.com/0851/vscode-alias-path/blob/master/README.EN.md)

command + left click 跳转到文件 ，支持别名

## 参数
![setting](./image/setting.png)
```json
{
  "aliaspath.alias": {
    "type": "object",
    "default": {
      "@": "${cwd}/src",
      "~": "${cwd}/src",
      "~~": "${cwd}/newsrc"
    },
    "description": "你可以使用${cwd}代表当前工作目录的绝对路径"
  },
  "aliaspath.activeLanguages": {
    "type": [
      "array",
      "object",
      "string"
    ],
    "default": {
      "pattern": "**"
    },
    "description": "支持激活语言"
  },
  "aliaspath.configFile": {
    "type": "string",
    "default": ".aliaspath.json",
    "description": "项目根目录下的配置文件"
  },
  "aliaspath.maxDependFileSize": {
    "type": "number",
    "default": 2,
    "description": "依赖文件最大大小 MB"
  },
  "aliaspath.allowedExt": {
    "type": "array",
    "default": [
      "js",
      "ts",
      "tsx",
      "jsx",
      "vue"
    ],
    "description": "允许忽略的扩展名列表"
  }
}
```