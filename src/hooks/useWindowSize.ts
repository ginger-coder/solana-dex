import { useState, useEffect } from 'react';

/**
 * 自定义钩子，用于检测和响应窗口大小变化
 * @returns 包含窗口宽度和高度的对象
 */
export const useWindowSize = () => {
  // 初始状态为 0 (在服务端渲染时)，或当前窗口大小(在客户端)
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    // 确保代码在浏览器环境中运行
    if (typeof window === 'undefined') return;

    // 窗口大小变化的处理函数
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // 添加事件监听器
    window.addEventListener('resize', handleResize);
    
    // 确保我们有初始值
    handleResize();

    // 清理函数
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

/**
 * 检查是否为小屏幕设备
 * @param width 当前窗口宽度
 * @param breakpoint 断点宽度，默认为 480px
 * @returns 是否为小屏幕设备
 */
export const isSmallScreen = (width: number, breakpoint = 480): boolean => {
  return width <= breakpoint;
};

/**
 * 检查是否为中等屏幕设备
 * @param width 当前窗口宽度
 * @returns 是否为中等屏幕设备
 */
export const isMediumScreen = (width: number): boolean => {
  return width > 480 && width <= 768;
};

/**
 * 检查是否为大屏幕设备
 * @param width 当前窗口宽度
 * @returns 是否为大屏幕设备
 */
export const isLargeScreen = (width: number): boolean => {
  return width > 768;
};

export default useWindowSize;
