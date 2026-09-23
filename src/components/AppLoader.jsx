import { useEffect, useState } from 'react';
import CategoryIcon from './CategoryIcon';
import './AppLoader.css';

/** CategoryIcon에 쓰이는 음식 카테고리들을 순서대로 돌려가며 보여준다. */
const CATEGORY_CYCLE = [
  '육류',
  '해산물',
  '채소',
  '과일',
  '달걀·두부·콩',
  '유제품',
  '곡류·떡·빵',
  '면류',
  '양념·소스',
  '간식·디저트',
  '음료·주류',
];

export default function AppLoader() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % CATEGORY_CYCLE.length);
    }, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="app-loader">
      <div className="app-loader-icon" key={index}>
        <CategoryIcon categoryName={CATEGORY_CYCLE[index]} size={56} />
      </div>
    </div>
  );
}
