import axios from 'axios';

// إعداد الاتصال الأساسي بالخادم على البورت 5002
const API = axios.create({
  baseURL: 'http://localhost:5002',
  withCredentials: true, // مهم جداً للتعامل مع ملفات تعريف الارتباط والجلسات (Sessions)
  headers: {
    'Content-Type': 'application/json',
  },
});

// اعتراض الطلبات لإضافة الـ Token إذا كان موجوداً
API.interceptors.request.use(
  (config) => {
    // يمكنك جلب التوكن من التخزين المحلي إذا كان مخزناً هناك
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;