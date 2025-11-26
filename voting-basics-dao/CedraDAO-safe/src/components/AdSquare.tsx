import React from 'react';
import parthenonoImg from '../assets/parthenono.jpeg';

const AdSquare: React.FC = () => {
  return (
    <div className="mt-6 w-full">
      <div className="bg-[#ffc30d] rounded-lg overflow-hidden">
        <img
          src={parthenonoImg}
          alt="Advertisement"
          className="w-full h-auto object-cover"
        />
      </div>
    </div>
  );
};

export default AdSquare;
