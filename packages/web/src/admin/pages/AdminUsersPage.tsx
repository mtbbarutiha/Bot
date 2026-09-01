import { usePetStore } from '../../hooks/usePetStore';

export function AdminUsersPage() {
  const { owners } = usePetStore();

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>کاربران</h1>
          <p>{owners.length} صاحب پت</p>
        </div>
      </header>

      <div className="admin-grid admin-grid--users">
        {owners.map((owner) => (
          <article key={owner.id} className="admin-user-card">
            <div className="admin-user-head">
              <h3>{owner.name}</h3>
              <span className="admin-badge">{owner.city}</span>
            </div>
            <p className="muted">{owner.pets.length} پت</p>
            <div className="admin-user-pets">
              {owner.pets.map((pet) => (
                <div key={pet.id} className="admin-user-pet">
                  <img src={pet.imageUrl} alt={pet.name} />
                  <div>
                    <strong>{pet.name}</strong>
                    <small>{pet.breed}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
