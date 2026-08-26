#!/usr/bin/env bash

set -u

project_dir="/home/giofahreza/dev/yow/giofahreza.github.io/game"
node_bin="/home/giofahreza/.nvm/versions/node/v24.14.0/bin/node"
vite_bin="${project_dir}/node_modules/vite/bin/vite.js"
tunnel_config="/home/giofahreza/.cloudflared/test5-iowb-mobile.yml"

if ! curl --silent --max-time 2 http://127.0.0.1:8104/ >/dev/null; then
  cd "${project_dir}" || exit 1
  nohup setsid "${node_bin}" "${vite_bin}" --host 0.0.0.0 \
    >>"${project_dir}/.vite-8104.log" 2>&1 </dev/null &
fi

if ! pgrep -f "${tunnel_config}" >/dev/null; then
  nohup setsid /usr/bin/cloudflared --no-autoupdate \
    --config "${tunnel_config}" tunnel run \
    >>"/home/giofahreza/.cloudflared/test5-iowb-mobile.log" \
    2>&1 </dev/null &
fi
