package com.caretrack.web;

import com.caretrack.domain.AppUser;
import com.caretrack.repo.AppUserRepository;
import com.caretrack.security.CurrentUser;
import com.caretrack.security.JwtService;
import com.caretrack.web.dto.ApiDtos.AuthResponse;
import com.caretrack.web.dto.ApiDtos.LoginRequest;
import com.caretrack.web.dto.ApiDtos.RegisterRequest;
import com.caretrack.web.dto.ApiDtos.UserResponse;
import jakarta.validation.Valid;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final CurrentUser currentUser;

    public AuthController(
            AppUserRepository users,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            CurrentUser currentUser
    ) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.currentUser = currentUser;
    }

    @PostMapping("/auth/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(CONFLICT, "An account with that email already exists");
        }
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setDisplayName(request.displayName().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        users.save(user);
        return toAuth(user);
    }

    @PostMapping("/auth/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        AppUser user = users.findByEmailIgnoreCase(request.email().trim())
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid email or password");
        }
        return toAuth(user);
    }

    @GetMapping("/me")
    public UserResponse me() {
        AppUser user = currentUser.require();
        return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName());
    }

    private AuthResponse toAuth(AppUser user) {
        return new AuthResponse(
                jwtService.issue(user.getEmail()),
                new UserResponse(user.getId(), user.getEmail(), user.getDisplayName())
        );
    }
}
