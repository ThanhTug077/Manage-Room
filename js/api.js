// Cau hinh goc cua MockAPI. Neu doi project MockAPI, chi can doi URL nay.
const API_BASE_URL = "https://69ead50515c7e2d5126a0f46.mockapi.io/v1";

// Anh xa ten resource trong code sang ten endpoint tren MockAPI.
const ENDPOINTS = {
  rooms: "rooms",
  students: "students"
};

// Ghep URL day du cho tung resource, co the kem id khi can thao tac mot ban ghi.
function buildUrl(resource, id = "") {
  const endpoint = ENDPOINTS[resource] || resource;
  const suffix = id ? `/${id}` : "";
  return `${API_BASE_URL}/${endpoint}${suffix}`;
}

// Ham dung chung cho moi request API: gui fetch, parse JSON va nem loi ro rang neu HTTP fail.
async function requestJson(resource, options = {}) {
  const response = await fetch(buildUrl(resource, options.id), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.data ? JSON.stringify(options.data) : undefined
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const text = await response.text();
      detail = text || detail;
    } catch (error) {
      detail = response.statusText;
    }
    throw new Error(`API ${response.status}: ${detail}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Wrapper CRUD de cac file khac khong phai viet lai fetch cho tung thao tac.
const DormAPI = {
  list(resource) {
    return requestJson(resource);
  },
  get(resource, id) {
    return requestJson(resource, { id });
  },
  create(resource, data) {
    return requestJson(resource, { method: "POST", data });
  },
  update(resource, id, data) {
    return requestJson(resource, { method: "PUT", id, data });
  },
  remove(resource, id) {
    return requestJson(resource, { method: "DELETE", id });
  }
};
