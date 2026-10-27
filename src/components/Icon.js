import React from 'react';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';
import { COLORS } from '../constants/colors';

const ICONS = {
  machines: (
    <>
      <Rect x="2" y="9" width="13" height="7" rx="1.5" />
      <Path d="M15 12h4l3 3v1h-7" />
      <Path d="M5 9V5h5l2 4" />
      <Circle cx="6" cy="18" r="2" />
      <Circle cx="17" cy="18" r="2" />
    </>
  ),
  parts: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
  orders: (
    <>
      <Rect x="5" y="4" width="14" height="17" rx="2" />
      <Path d="M9 4V3h6v1" />
      <Polyline points="9,12 11,14 15,10" />
      <Line x1="9" y1="18" x2="15" y2="18" />
    </>
  ),
  client_companies: (
    <>
      <Rect x="4" y="3" width="10" height="18" rx="1" />
      <Path d="M14 9h6v12h-6" />
      <Path d="M7 7h4M7 11h4M7 15h4M17 13h0M17 17h0" />
    </>
  ),
  notifications: (
    <>
      <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
      <Path d="M10 21a2 2 0 0 0 4 0" />
    </>
  ),
  reports: (
    <>
      <Line x1="4" y1="20" x2="20" y2="20" />
      <Rect x="5" y="11" width="3" height="9" />
      <Rect x="10.5" y="6" width="3" height="14" />
      <Rect x="16" y="14" width="3" height="6" />
    </>
  ),
  users: (
    <>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" />
      <Path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2.2.7 4 2.5 4 5.5" />
    </>
  ),
  profile: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </>
  ),
  camera: (
    <>
      <Path d="M3 8h4l2-3h6l2 3h4v12H3z" />
      <Circle cx="12" cy="13" r="4" />
    </>
  ),
  gallery: (
    <>
      <Rect x="3" y="4" width="18" height="16" rx="2" />
      <Circle cx="9" cy="10" r="2" />
      <Path d="M3 17l5-5 4 4 3-3 6 6" />
    </>
  ),
  file: (
    <>
      <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <Path d="M14 3v5h5" />
    </>
  ),
  edit: (
    <>
      <Path d="M4 20h4L19 9l-4-4L4 16z" />
      <Path d="M13.5 6.5l4 4" />
    </>
  ),
};

const Icon = ({ name, size = 24, color = COLORS.orange, strokeWidth = 1.8 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round">
    {ICONS[name] || null}
  </Svg>
);

export default Icon;
