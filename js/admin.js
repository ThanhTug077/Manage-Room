//Cấu hình  MOC 
const API_BASE_URL = "https://69ead50515c7e2d5126a0f46.mockapi.io/v1";

//Danh sách các tài nguyên truy vấn trong API MOC
const ENDPOINTS = {
  rooms: "rooms",
  students: "students"
};

//Hàm xd URL
function buildUrl(resource, id = "") {
  const endpoint = ENDPOINTS[resource] || resource;
  const suffix = id ? `/${id}` : "";
  return `${API_BASE_URL}/${endpoint}${suffix}`;
}

//hàm bất đồng hàm này tự động hóa ( chuyển đổi dữ , tự ghép  ,lọc dữ liệu )
async function requestJson(resource, options = {}) {
  const response = await fetch(buildUrl(resource, options.id), {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.data ? JSON.stringify(options.data) : undefined
  });

  //Xử lý các và trạng thái nếu có lỗi về 
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
