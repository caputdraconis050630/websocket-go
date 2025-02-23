import React from 'react';
import { useNavigate } from 'react-router-dom';

const CreateRoom: React.FC = () => {
  const navigate = useNavigate();

  const create = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    try {
      const resp = await fetch('http://localhost:8000/create');
      const { room_id }: { room_id: string } = await resp.json();

      navigate(`/room/${room_id}`, { state: { id: room_id } });
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  return (
    <div>
      <button onClick={create}>Create Room</button>
    </div>
  );
};

export default CreateRoom;
